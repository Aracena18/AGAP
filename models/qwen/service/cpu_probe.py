"""Actual, unquantized CPU compatibility probe; never an approved GPU release.

Uses the exact imported base/F weights and existing prompt/schema checks. No
training, weight merge, Hub resolution, server, or lending action is performed.
"""
import argparse
import importlib.metadata
import json
import os
from pathlib import Path
import resource
import time

from models.qwen.handoff.files import loads, read_json, require, sha256, write_new
from models.qwen.handoff.schema import validate
from models.qwen.import_f import verify
from models.qwen.service.review import screen
from models.qwen.service.server import GpuModel, load_bindings

PINS = {'torch': '2.11.0+cpu', 'transformers': '5.17.0', 'peft': '0.21.2',
        'huggingface_hub': '1.33.0', 'safetensors': '0.8.0', 'accelerate': '1.15.0'}
HERE = Path(__file__).resolve().parent


def settings(args):
    require(args.allow_unapproved_fictional_cpu, 'Explicit fictional CPU experiment selection is required')
    require(1 <= args.threads <= 4 and 30 <= args.seconds <= 600, 'CPU budget exceeds reviewed limits')
    require(sha256(args.candidate) == args.candidate_sha256, 'Candidate checksum differs')
    env = {'NODE_ENV': 'test', 'EVIDENCE_RECORD_MODE': 'fictional', 'FICTIONAL_PILOT_ENABLED': 'true',
           'QWEN_FICTIONAL_CANDIDATE_FILE': args.candidate,
           'QWEN_FICTIONAL_CANDIDATE_SHA256': args.candidate_sha256}
    return load_bindings(env)


class CpuCompatibilityModel(GpuModel):
    """Shares bounded generation/adapter inspection, with an explicit CPU loader.

    This does not call the CUDA constructor or relax its readiness requirements.
    Promotion to float32 preserves stored values; no quantization is performed.
    """
    def __init__(self, root, threads):
        os.environ.update(HF_HUB_OFFLINE='1', TRANSFORMERS_OFFLINE='1')
        import torch
        from transformers import AutoProcessor, AutoModelForImageTextToText
        self.torch = torch
        torch.set_num_threads(threads)
        torch.set_num_interop_threads(1)
        self.processor = AutoProcessor.from_pretrained(str(root / 'base_model'), local_files_only=True,
                                                      trust_remote_code=False)
        self.tokenizer = getattr(self.processor, 'tokenizer', self.processor)
        self.model = AutoModelForImageTextToText.from_pretrained(str(root / 'base_model'),
            dtype=torch.float32, device_map={'': 'cpu'}, low_cpu_mem_usage=True,
            local_files_only=True, trust_remote_code=False, attn_implementation='sdpa')
        self.model.eval()
        for parameter in self.model.parameters():
            parameter.requires_grad_(False)
        self.review_enabled, self.base_disabled_parity = False, None

    def attach_review(self, root):
        from peft import PeftModel
        require(not self.review_enabled, 'Adapter already attached')
        probe = self.tokenizer('FICTIONAL model readiness.', return_tensors='pt')
        with self.torch.inference_mode():
            clean = self.model.generate(**probe, max_new_tokens=8, do_sample=False)
        self.model = PeftModel.from_pretrained(self.model, str(root / 'adapter'), is_trainable=False,
                                             local_files_only=True)
        self.model.eval()
        with self.model.disable_adapter(), self.torch.inference_mode():
            disabled = self.model.generate(**probe, max_new_tokens=8, do_sample=False)
        require(self.torch.equal(clean, disabled), 'CPU clean/disabled probe differs')
        self.review_enabled, self.base_disabled_parity = True, True
        self.check_adapter()


def run(args, model_factory=CpuCompatibilityModel):
    bindings = settings(args)
    root, output = Path(args.artifacts).resolve(), Path(args.output).resolve()
    require(not output.exists(), 'Refusing to overwrite prior inference evidence')
    verified = verify(root, args.manifest_sha256)
    versions = {name: importlib.metadata.version(name) for name in PINS}
    require(versions == PINS, 'CPU runtime differs from pinned compatibility recipe')
    output.mkdir(parents=True)
    write_new(output / 'binding.json', {'scope': 'fictional_cpu_compatibility_not_independent',
        'approved': False, 'promotion': 'not_promoted', 'runtime': versions, 'device': 'cpu',
        'dtype': 'float32', 'quantized': False, 'threads': args.threads,
        'perGenerationDeadlineSeconds': args.seconds, 'runnerSha256': sha256(__file__),
        'serviceSha256': sha256(HERE / 'server.py'), 'guardSha256': sha256(HERE / 'review.py'),
        'reviewOnly': args.review_only,
        'candidateSha256': args.candidate_sha256, 'artifactVerification': verified})
    start = time.monotonic()
    try:
        model = model_factory(root, args.threads)
        extraction = {'page': 1, 'text': 'FICTIONAL no financial amounts.',
                      'provenance': bindings['extraction']}
        smoke = read_json(HERE.parent / 'experiment_f/development-smoke.inputs.json')[0]
        review = {'question': smoke['question'], 'sources': smoke['sources'],
                  'provenance': bindings['review']}
        results, metrics = {}, {}
        phases = [('review-f', 'review', review)] if args.review_only else [
            ('extract-clean', 'extract', extraction), ('review-f', 'review', review),
            ('extract-disabled', 'extract', extraction)]
        for name, capability, request in phases:
            if capability == 'review':
                model.attach_review(root)
            before = time.monotonic()
            if capability == 'review':
                for attempt in (1, 2):
                    suffix = '' if attempt == 1 else '-retry'
                    raw = model.generate(capability, request, before + args.seconds, repair=attempt > 1)
                    write_new(output / (name + suffix + '.raw.json'), {'request': request, 'text': raw})
                    value = screen(raw, request['sources'], attempt)
                    write_new(output / (name + suffix + '.screened.json'), value)
                    if value['status'] == 'REQUIRES_HUMAN_REVIEW':
                        break
                write_new(output / (name + '.metrics.json'), {
                    'elapsedMs': round((time.monotonic() - before) * 1000), 'attemptsUsed': attempt,
                    'processPeakRssBytes': resource.getrusage(resource.RUSAGE_SELF).ru_maxrss * 1024})
                require(value['status'] == 'REQUIRES_HUMAN_REVIEW', 'CPU review failed source/schema checks')
            else:
                raw = model.generate(capability, request, before + args.seconds)
                write_new(output / (name + '.raw.json'), {'request': request, 'text': raw})
                value = loads(raw)
                require(isinstance(value, list) and len(value) <= 30, 'Invalid CPU extraction output')
                validate(value, read_json(HERE / 'finding.schema.json'))
                for finding in value:
                    require(finding['page'] == 1 and finding['excerpt'] in request['text'], 'Unsupported CPU extraction citation')
            results[name] = value
            metrics[name] = {'elapsedMs': round((time.monotonic() - before) * 1000),
                             'processPeakRssBytes': resource.getrusage(resource.RUSAGE_SELF).ru_maxrss * 1024}
            write_new(output / (name + '.checked.json'), value)
        if not args.review_only:
            require(results['extract-clean'] == results['extract-disabled'], 'CPU baseline behavior changed after attachment')
        result = {'modelExecuted': True, 'allChecksPassed': True, 'cleanDisabledParity': model.base_disabled_parity,
                  'extractionStableAcrossReview': None if args.review_only else True,
                  'scope': 'review_only' if args.review_only else 'extraction_review_switching',
                  'device': 'cpu', 'dtype': 'float32',
                  'elapsedMs': round((time.monotonic() - start) * 1000), 'metrics': metrics,
                  'semanticCorrectness': 'not_independently_evaluated', 'promotion': 'not_promoted',
                  'httpApplicationIntegrationTested': False, 'cudaBf16CompatibilityTested': False}
        write_new(output / 'result.json', result)
        return result
    except Exception as error:
        write_new(output / 'failure.json', {'allChecksPassed': False, 'exceptionType': type(error).__name__,
                  'reason': str(error)[:1000], 'promotion': 'not_promoted',
                  'elapsedMs': round((time.monotonic() - start) * 1000),
                  'processPeakRssBytes': resource.getrusage(resource.RUSAGE_SELF).ru_maxrss * 1024})
        raise


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--artifacts', required=True)
    parser.add_argument('--manifest-sha256', required=True)
    parser.add_argument('--candidate', required=True)
    parser.add_argument('--candidate-sha256', required=True)
    parser.add_argument('--output', required=True)
    parser.add_argument('--threads', type=int, default=4)
    parser.add_argument('--seconds', type=int, default=600)
    parser.add_argument('--allow-unapproved-fictional-cpu', action='store_true')
    parser.add_argument('--review-only', action='store_true', help='Measure F only; does not establish extraction parity')
    try:
        print(json.dumps(run(parser.parse_args()), indent=2))
    except Exception as error:
        parser.exit(2, 'CPU compatibility probe failed: ' + str(error) + '\n')


if __name__ == '__main__':
    main()
