import argparse
import sys
from pathlib import Path
from .core import preflight, prepare, validate_predictions
from ..handoff.files import EvidenceError, read_json, require, serialize, sha256, write_new


def main(argv=None):
    p = argparse.ArgumentParser(description='Offline QWN-01 public-development verification; never promotes')
    commands = p.add_subparsers(dest='command', required=True)
    s = commands.add_parser('preflight'); s.add_argument('--out', required=True)
    s = commands.add_parser('prepare'); s.add_argument('--preview', required=True); s.add_argument('--expected-preview-sha256', required=True); s.add_argument('--out', required=True)
    for command in ('validate', 'run-gpu'):
        s = commands.add_parser(command); s.add_argument('--inputs', required=True); s.add_argument('--expected-input-sha256', required=True); s.add_argument('--out', required=True)
        if command == 'validate':
            s.add_argument('--predictions', required=True); s.add_argument('--export-manifest', required=True)
            s.add_argument('--expected-export-sha256', required=True); s.add_argument('--variant', required=True, choices=['baseline', 'tuned'])
        else:
            s.add_argument('--artifacts', required=True); s.add_argument('--expected-export-sha256', required=True)
    a = p.parse_args(argv)
    try:
        if a.command == 'preflight':
            result = preflight(); write_new(a.out, result)
        elif a.command == 'prepare':
            result = prepare(a.preview, a.expected_preview_sha256, a.out)
        elif a.command == 'validate':
            require(sha256(a.export_manifest) == a.expected_export_sha256, 'Export manifest commitment differs')
            result = validate_predictions(Path(a.inputs), a.expected_input_sha256, a.predictions, read_json(a.export_manifest), a.variant); write_new(a.out, result)
        else:
            from .gpu import run
            result = run(a.inputs, a.expected_input_sha256, a.artifacts, a.expected_export_sha256, a.out)
        sys.stdout.write(serialize(result))
        return 2 if a.command == 'preflight' and not result['readyToAttemptGpuLoad'] or a.command == 'run-gpu' and not result['bothCanonicalOutputs'] else 0
    except (EvidenceError, OSError, ValueError, TypeError, KeyError) as error:
        sys.stderr.write(serialize({'error': str(error), 'promotion': 'not_promoted'})); return 1


if __name__ == '__main__':
    raise SystemExit(main())
