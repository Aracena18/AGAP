"""Immutable candidate packaging, not deployment or independent promotion."""
import hashlib
from pathlib import Path
import shutil
from .audit import audit, REQUIRED_FILES
from .files import file_under, outside_git, read_json, require, serialize, sha256


def _card(run, report):
    return f"""# QWN-01 candidate model/run card

Run: {run['id']}. Declared status: {run['status']}.
Base: {run['base']['id']} at {run['base']['revision']}.
Processor revision: {run['base']['processorRevision']}.
Training code revision: {run['codeRevision']}; seed: {run['seed']}.
Declared base/adapter license: {run['license']['base']} / {run['license']['adapter']}.
Declared data permission: {run['license']['dataPermissionReference']}.
Adapter SHA-256: {report['adapter']['weightsSha256']}.
Data release SHA-256: {report['data']['manifestSha256']}.

Purpose: source-linked candidate extraction/clarification on reviewed fictional data.
No authoritative money calculation, document authenticity, suitability judgment,
approval, payment or journal authority is supplied. No QWN-02/QWN-03 release.

This package passed local consistency checks, not an attestation that a model
executed or that reviewers approved it. Output findings use the producer's schema;
semantic/source correctness and improvement remain independently unassessed.
Case latency/memory may remain null and are reported with observed denominators.
Base/tuned outputs and common preprocessing/limits are bound to their exact bytes.

Earl retains holdout and independent comparison. No holdout data is packaged.
Aaron/Robert retain the single inference adapter and runtime wiring. Promotion:
NOT PROMOTED. Keep the manual/template or better evaluated baseline available.

Use the pinned training code/environment and real reload-smoke evidence supplied
under evidence/ for reproduction in a compatible offline ML environment. The
packager never imports torch, loads weights, installs packages or downloads models.
Static tensor checks do not replace reproducing the real load/inference smoke test.
Large weights/checkpoints remain outside Git; no automatic upload is performed.
"""


def build(run_path, artifact_root, release_root, expected_sha, output):
    report = audit(run_path, artifact_root, release_root, expected_sha)
    require(report["readyForIndependentEvaluation"], "Candidate evidence is incomplete; run audit and resolve its blockers")
    run = read_json(run_path)
    require(sha256(run_path) == report["runRecordSha256"], "Run record changed during audit")
    output = outside_git(output)
    require(not output.exists(), "Refusing to overwrite any prior package or partial export")
    output.parent.mkdir(parents=True, exist_ok=True)
    output.mkdir()
    files = {}
    for role in sorted(REQUIRED_FILES):
        source = file_under(artifact_root, run["files"][role])
        if role == "adapter_weights":
            name = "adapter/adapter_model.safetensors"
        elif role == "adapter_config":
            name = "adapter/adapter_config.json"
        elif role == "prompt":
            name = "evidence/prompt.txt"
        elif role == "training_code":
            require(source.suffix in {".py", ".ipynb"}, "Training code must be an explicit script/notebook export")
            name = "evidence/training_code" + source.suffix
        else:
            name = "evidence/" + role + ".json"
        destination = output / name
        destination.parent.mkdir(parents=True, exist_ok=True)
        with source.open("rb") as src, destination.open("xb") as dst:
            shutil.copyfileobj(src, dst, 1024 * 1024)
        require(sha256(destination) == report["files"][role]["sha256"], "Evidence changed during copy; no final manifest written")
        files[name] = {"sha256": sha256(destination), "bytes": destination.stat().st_size, "role": role}
    # Do not copy corpus text, targets, holdout files, arbitrary adjacent files or
    # notebook runtime secrets discovered from environment variables.
    for name, body in (("run.json", serialize(run)), ("audit.json", serialize(report)), ("MODEL_CARD.md", _card(run, report))):
        with (output / name).open("x", encoding="utf-8") as stream:
            stream.write(body)
        files[name] = {"sha256": sha256(output / name), "bytes": (output / name).stat().st_size, "role": "metadata"}
    source_dir = Path(__file__).parent
    manifest = {"schemaVersion": "agap-qwn-candidate/v1", "runId": run["id"], "purpose": "independent_evaluation_candidate",
                "files": files, "weightsSha256": report["adapter"]["weightsSha256"], "datasetManifestSha256": report["data"]["manifestSha256"],
                "toolingSha256": hashlib.sha256(serialize({p.name: sha256(p) for p in sorted(source_dir.glob('*.py'))}).encode()).hexdigest(),
                "promotion": "not_promoted", "executionAttested": False, "reviewAuthenticated": False}
    with (output / "manifest.json").open("x", encoding="utf-8") as stream:
        stream.write(serialize(manifest))
    return verify(output, sha256(output / "manifest.json"))


def verify(root, expected_manifest_sha):
    require(isinstance(expected_manifest_sha, str) and len(expected_manifest_sha) == 64, "Expected package manifest checksum required")
    path = file_under(root, "manifest.json")
    require(sha256(path) == expected_manifest_sha, "Candidate manifest commitment differs")
    m = read_json(path)
    require(m.get("schemaVersion") == "agap-qwn-candidate/v1" and m.get("purpose") == "independent_evaluation_candidate"
            and m.get("promotion") == "not_promoted" and m.get("executionAttested") is False and m.get("reviewAuthenticated") is False,
            "This is not an authenticated/promoted runtime release")
    require(isinstance(m.get("files"), dict) and m["files"], "Package inventory missing")
    metadata = {name for name, item in m["files"].items() if item.get("role") == "metadata"}
    require(metadata == {"run.json", "audit.json", "MODEL_CARD.md"}, "Unexpected metadata or missing run/card evidence")
    for name, item in m["files"].items():
        role = item.get("role")
        expected = "adapter/adapter_model.safetensors" if role == "adapter_weights" else "adapter/adapter_config.json" if role == "adapter_config" else "evidence/prompt.txt" if role == "prompt" else None
        if role == "training_code":
            require(name in {"evidence/training_code.py", "evidence/training_code.ipynb"}, "Unexpected training code path")
        elif role != "metadata":
            require(name == (expected or "evidence/" + str(role) + ".json"), "Unexpected role path in package")
    actual = {p.relative_to(root).as_posix() for p in Path(root).rglob('*') if p.is_file() or p.is_symlink()}
    require(actual == set(m["files"]) | {"manifest.json"}, "Package contains missing/extra evidence")
    for name, item in m["files"].items():
        p = file_under(root, name)
        require(sha256(p) == item.get("sha256") and p.stat().st_size == item.get("bytes"), "Package evidence checksum/size differs")
    require(m["files"].get("adapter/adapter_model.safetensors", {}).get("sha256") == m.get("weightsSha256"), "Adapter commitment differs")
    roles = [item.get("role") for item in m["files"].values() if item.get("role") != "metadata"]
    require(set(roles) == REQUIRED_FILES and len(roles) == len(REQUIRED_FILES), "Candidate evidence roles incomplete or duplicated")
    report = read_json(file_under(root, "audit.json"))
    require(report.get("readyForIndependentEvaluation") is True and not report.get("blockers") and report.get("promotion") == "not_promoted"
            and report.get("adapter", {}).get("weightsSha256") == m["weightsSha256"] and report.get("data", {}).get("manifestSha256") == m["datasetManifestSha256"],
            "Candidate audit binding differs")
    require(sha256(file_under(root, "run.json")) == report.get("runRecordSha256"), "Packaged run record differs from audit")
    for name, item in m["files"].items():
        if item.get("role") != "metadata":
            require(report.get("files", {}).get(item["role"], {}).get("sha256") == item["sha256"], "Evidence role differs from audit")
    require(read_json(file_under(root, "run.json")).get("id") == report.get("runId") == m.get("runId"), "Candidate run identities differ")
    return {"schemaVersion": "agap-qwn-verification/v1", "manifestSha256": expected_manifest_sha, "runId": m["runId"],
            "filesVerified": len(m["files"]), "integrity": "passed", "promotion": "not_promoted", "executionAttested": False}
