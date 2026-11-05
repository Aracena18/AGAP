"""Offline identical-task clean-base/F comparison; public development smoke only.

No targets, private holdout, training, promotion or lending decisions. Run in the
same reviewed GPU image with the server stopped so it owns the single GPU model.
"""
import argparse
import importlib.metadata
from pathlib import Path
import platform
from threading import Timer
import time

from ..handoff.files import EvidenceError, read_json, require, sha256, write_new
from .review import reject, screen, validate_input
from .server import GpuModel, InferenceFailure, fatal_timeout, load_bindings, validate_artifacts


def compare(args):
    output = Path(args.output)
    require(not output.exists(), 'Refusing to overwrite prior comparison')
    rows = read_json(args.inputs)
    require(isinstance(rows, list) and 1 <= len(rows) <= 12, 'Supply 1-12 public fictional input bundles, without targets')
    for row in rows:
        validate_input(row)
        require(all('FICTIONAL' in source['quote'].upper() for source in row['sources']), 'Explicit fictional source text required')
    env = {'NODE_ENV': 'development', 'EVIDENCE_RECORD_MODE': 'fictional', 'FICTIONAL_PILOT_ENABLED': 'true',
           'QWEN_FICTIONAL_CANDIDATE_FILE': args.candidate, 'QWEN_FICTIONAL_CANDIDATE_SHA256': args.candidate_sha256,
           'QWEN_ARTIFACT_DIRECTORY': args.artifacts, 'QWEN_EXPORT_MANIFEST_SHA256': args.manifest_sha256}
    bindings = load_bindings(env)
    root = validate_artifacts(env, bindings)
    output.mkdir(parents=True)
    write_new(output / 'binding.json', {'scope': 'public_development_smoke_not_independent', 'inputsSha256': sha256(args.inputs),
        'candidateSha256': args.candidate_sha256, 'manifestSha256': args.manifest_sha256, 'runnerSha256': sha256(__file__),
        'serviceSha256': sha256(Path(__file__).with_name('server.py')), 'guardSha256': sha256(Path(__file__).with_name('review.py')),
        'artifact': bindings['review'], 'settings': {'maxInputTokens': 1536, 'maxNewTokens': 384, 'doSample': False, 'maximumRequestSeconds': 90},
        'semanticCorrectness': 'not_independently_evaluated', 'promotion': 'not_promoted'})
    startup = Timer(600, fatal_timeout); startup.daemon = True; startup.start()
    try:
        model = GpuModel(root, False)
    finally:
        startup.cancel()
    torch = model.torch
    write_new(output / 'environment.json', {'python': platform.python_version(),
        'packages': {key: importlib.metadata.version(key) for key in read_json(root / 'environment_versions.json')},
        'gpu': torch.cuda.get_device_name(0), 'runtimePrecision': 'bfloat16', 'modelExecuted': True})
    variants = {}
    for variant in ('baseline', 'tuned', 'disabled'):
        if variant == 'tuned':
            watchdog = Timer(600, fatal_timeout); watchdog.daemon = True; watchdog.start()
            try:
                model.attach_review(root)
            finally:
                watchdog.cancel()
        results = []
        for index, row in enumerate(rows):
            torch.cuda.synchronize(); torch.cuda.reset_peak_memory_stats()
            start = time.monotonic()
            watchdog = Timer(95, fatal_timeout); watchdog.daemon = True; watchdog.start()
            try:
                raw = model.generate('review' if variant == 'tuned' else 'review_baseline', row, start + 90)
                result = screen(raw, row['sources'])
            except InferenceFailure as error:
                raw, result = None, reject(str(error))
            finally:
                watchdog.cancel()
            torch.cuda.synchronize()
            record = {'caseIndex': index, 'variant': variant, 'artifactSha256': bindings['review']['artifactSha256'] if variant == 'tuned' else None,
                'rawOutput': raw, 'result': result, 'elapsedMs': round((time.monotonic() - start) * 1000, 2),
                'peakMemoryBytes': int(torch.cuda.max_memory_allocated())}
            write_new(output / f'{variant}-{index:02d}.json', record)
            results.append(record)
        variants[variant] = results
    parity = all(base['rawOutput'] is not None and base['rawOutput'] == disabled['rawOutput']
                 for base, disabled in zip(variants['baseline'], variants['disabled']))
    report = {'scope': 'public_development_smoke_not_independent', 'modelExecuted': True,
        'cases': len(rows), 'identicalTaskPromptInputSchemaLimits': True, 'cleanDisabledParity': parity,
        'structuralSourcePassCounts': {variant: sum(case['result']['status'] == 'REQUIRES_HUMAN_REVIEW' for case in cases)
                                       for variant, cases in variants.items()},
        'semanticCorrectness': 'not_independently_evaluated', 'promotion': 'not_promoted'}
    write_new(output / 'comparison.json', report)
    return report


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--artifacts', required=True)
    parser.add_argument('--manifest-sha256', required=True)
    parser.add_argument('--candidate', required=True)
    parser.add_argument('--candidate-sha256', required=True)
    parser.add_argument('--inputs', default=str(Path(__file__).parents[1] / 'experiment_f/development-smoke.inputs.json'))
    parser.add_argument('--output', required=True)
    args = parser.parse_args()
    try:
        import json
        result = compare(args)
        print(json.dumps(result, indent=2))
        if not result['cleanDisabledParity']:
            raise EvidenceError('Clean/disabled comparison failed; preserve outputs, do not activate')
    except (EvidenceError, OSError, ValueError, RuntimeError) as error:
        output = Path(args.output)
        if output.is_dir() and not (output / 'failure.json').exists():
            write_new(output / 'failure.json', {'status': 'failed', 'exceptionType': type(error).__name__,
                'modelExecutionCompleted': False, 'promotion': 'not_promoted'})
        parser.exit(2, 'GPU comparison unavailable: ' + str(error) + '\n')


if __name__ == '__main__':
    main()
