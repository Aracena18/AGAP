import argparse
import importlib.metadata
import platform
import sys
from pathlib import Path
from .audit import audit, draft
from .bundle import build, verify
from .research import inspect_export, package_export, verify_export
from .files import EvidenceError, inventory, serialize, write_new


def main(argv=None):
    parser = argparse.ArgumentParser(description="Offline QWN-01 evidence; never trains, loads or promotes a model")
    commands = parser.add_subparsers(dest="command", required=True)
    p = commands.add_parser("init"); p.add_argument("--run-id", required=True); p.add_argument("--out", required=True)
    p = commands.add_parser("inventory"); p.add_argument("--root", required=True); p.add_argument("--out", required=True)
    p = commands.add_parser("environment"); p.add_argument("--run-id", required=True); p.add_argument("--out", required=True)
    for name in ("audit", "package"):
        p = commands.add_parser(name); p.add_argument("--run", required=True); p.add_argument("--artifacts", required=True)
        p.add_argument("--release"); p.add_argument("--expected-release-sha256"); p.add_argument("--out", required=True)
    p = commands.add_parser("verify"); p.add_argument("--bundle", required=True); p.add_argument("--expected-manifest-sha256", required=True)
    for name in ("audit-export", "package-export"):
        p = commands.add_parser(name); p.add_argument("--root", required=True)
        p.add_argument("--expected-manifest-sha256", required=True); p.add_argument("--out", required=True)
    p = commands.add_parser("verify-export"); p.add_argument("--bundle", required=True); p.add_argument("--expected-manifest-sha256", required=True)
    args = parser.parse_args(argv)
    try:
        if args.command == "audit-export":
            result = inspect_export(args.root, args.expected_manifest_sha256)
        elif args.command == "package-export":
            result = package_export(args.root, args.expected_manifest_sha256, args.out)
        elif args.command == "verify-export":
            result = verify_export(args.bundle, args.expected_manifest_sha256)
        elif args.command == "init":
            result = draft(args.run_id)
        elif args.command == "inventory":
            result = inventory(args.root)
        elif args.command == "environment":
            versions = {}
            for name in ("torch", "transformers", "peft", "safetensors", "accelerate", "trl", "unsloth"):
                try:
                    versions[name] = importlib.metadata.version(name)
                except importlib.metadata.PackageNotFoundError:
                    versions[name] = None
            result = {"runId": args.run_id, "captureScope": "current_process_only_not_training_attestation", "python": platform.python_version(), "packages": versions}
        elif args.command == "audit":
            result = audit(args.run, args.artifacts, args.release, args.expected_release_sha256)
        elif args.command == "package":
            if not args.release or not args.expected_release_sha256:
                raise EvidenceError("Reviewed release and its independently supplied expected checksum are required")
            result = build(args.run, args.artifacts, args.release, args.expected_release_sha256, args.out)
        else:
            result = verify(Path(args.bundle), args.expected_manifest_sha256)
        package_commands = {"package", "verify", "package-export", "verify-export"}
        if args.command not in package_commands:
            write_new(args.out, result)
        sys.stdout.write(serialize({"command": args.command, "result": result if args.command in package_commands else str(args.out)}))
        return 2 if args.command == "audit" and not result["readyForIndependentEvaluation"] else 0
    except (EvidenceError, OSError, ValueError, TypeError, KeyError) as error:
        sys.stderr.write(serialize({"error": str(error), "promotion": "not_promoted"}))
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
