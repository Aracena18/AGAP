"""Opt-in offline GPU execution in the original environment, never a provider."""
import os
import time
from pathlib import Path
from .core import check_findings, load_inputs, preflight
from ..handoff.files import EvidenceError, file_under, loads, read_json, require, serialize, sha256, write_new
from ..handoff.research import inspect_export


def run(inputs, input_sha, artifacts, export_sha, output):
    output = Path(output)
    require(not output.exists(), 'Refusing to overwrite a prior GPU run')
    state = preflight()
    require(state['readyToAttemptGpuLoad'], 'GPU runtime unavailable; run preflight and use the original compatible GPU environment')
    export = read_json(file_under(artifacts, 'model_manifest.json'))
    recorded = read_json(file_under(artifacts, 'environment_versions.json'))
    require(all(state['packages'][k] == recorded.get(k) for k in state['packages']), 'Installed packages differ from the recorded export; review compatibility separately')
    inspected = inspect_export(artifacts, export_sha)
    m, rows, schema = load_inputs(Path(inputs), input_sha)
    output.mkdir(parents=True)
    write_new(output / 'preflight.json', state)
    write_new(output / 'run-binding.json', {'inputsSha256': input_sha, 'exportManifestSha256': export_sha,
              'runnerSha256': sha256(__file__), 'coreSha256': sha256(Path(__file__).with_name('core.py')),
              'settings': m['settings'], 'scope': m['scope'], 'promotion': 'not_promoted'})
    try:
        # No remote resolution or package installation; no runtime secrets read.
        os.environ['HF_HUB_OFFLINE'] = '1'
        os.environ['TRANSFORMERS_OFFLINE'] = '1'
        from unsloth import FastVisionModel
        import torch
        from peft import PeftModel
        require(torch.cuda.is_available() and torch.cuda.is_bf16_supported(), 'Actual CUDA BF16 support unavailable')
        torch.manual_seed(m['settings']['seed'])
        torch.cuda.manual_seed_all(m['settings']['seed'])
        model, processor = FastVisionModel.from_pretrained(
            model_name=str(Path(artifacts).resolve() / 'base_model'), load_in_4bit=False,
            dtype=torch.bfloat16, local_files_only=True, trust_remote_code=False)
        tokenizer = getattr(processor, 'tokenizer', processor)
        prompt = file_under(inputs, 'prompt.txt').read_text()
        results = {}
        # The pretrained baseline runs BEFORE adapter attachment. No optimizer,
        # training, merge, save_pretrained or disabling ambiguous adapter state.
        for variant in ('baseline', 'tuned'):
            if variant == 'tuned':
                model = PeftModel.from_pretrained(model, str(Path(artifacts).resolve() / 'adapter'), is_trainable=False, local_files_only=True)
            FastVisionModel.for_inference(model)
            model.eval()
            for parameter in model.parameters():
                parameter.requires_grad_(False)
            cases, checks = [], []
            with (output / (variant + '.raw.jsonl')).open('x', encoding='utf-8') as raw:
                for row in rows:
                    messages = [{'role': 'system', 'content': prompt + '\nFinding schema:\n' + serialize(schema)},
                                {'role': 'user', 'content': serialize(row)}]
                    rendered = tokenizer.apply_chat_template(messages, tokenize=False, add_generation_prompt=True, enable_thinking=False)
                    tokens = tokenizer(rendered, return_tensors='pt', add_special_tokens=False)
                    count = int(tokens['input_ids'].shape[-1])
                    require(count <= m['settings']['maxInputTokens'], 'Input exceeds fixed budget; source truncation is prohibited')
                    tokens = {k: v.to(next(model.parameters()).device) for k, v in tokens.items()}
                    torch.cuda.synchronize(); torch.cuda.reset_peak_memory_stats()
                    started = time.perf_counter()
                    with torch.inference_mode():
                        generated = model.generate(**tokens, max_new_tokens=m['settings']['maxNewTokens'], do_sample=False,
                                                   max_time=m['settings']['maxTimeSeconds'])
                    torch.cuda.synchronize()
                    elapsed = (time.perf_counter() - started) * 1000
                    memory = int(torch.cuda.max_memory_allocated())
                    tail = generated[0, count:]
                    text = tokenizer.decode(tail, skip_special_tokens=True)
                    item = {'caseId': row['caseId'], 'text': text, 'inputTokens': count, 'outputTokens': len(tail),
                            'tokenLimitReached': len(tail) >= m['settings']['maxNewTokens'], 'elapsedMs': elapsed, 'peakMemoryBytes': memory}
                    raw.write(serialize(item).strip().replace('\n', '') + '\n'); raw.flush()
                    try:
                        findings = loads(text)
                        check_findings(findings, row, schema)
                        require(not item['tokenLimitReached'], 'Generation exhausted token budget')
                        cases.append({'caseId': row['caseId'], 'findings': findings, 'elapsedMs': elapsed, 'peakMemoryBytes': memory})
                        checks.append({'caseId': row['caseId'], 'schemaAndReferences': 'passed'})
                    except (EvidenceError, KeyError, TypeError, ValueError):
                        checks.append({'caseId': row['caseId'], 'schemaAndReferences': 'failed', 'rawOutputPreserved': True})
                    del generated, tokens, tail
            artifact = {'baseModel': export['base_repository'], 'baseRevision': export['base_revision'],
                        'artifactSha256': None if variant == 'baseline' else inspected['adapter']['weightsSha256'],
                        'promptVersion': m['files']['prompt.txt'], 'schemaVersion': m['files']['finding.schema.json'],
                        'datasetManifestSha256': m['producerManifestSha256'], 'evaluationReference': 'public-development-smoke-not-independent'}
            complete = len(cases) == len(rows)
            results[variant] = {'checks': checks, 'completeCanonicalOutput': complete,
                                'semanticCorrectness': 'not_evaluated', 'rawSha256': sha256(output / (variant + '.raw.jsonl'))}
            if complete:
                write_new(output / (variant + '.predictions.json'), {'schemaVersion': 'eval-01-predictions/v1', 'inputCorpusSha256': m['inputCorpusSha256'],
                          'run': {'id': 'phase7-' + variant, 'origin': 'model', 'artifact': artifact, 'environment': serialize(state)}, 'cases': cases})
        write_new(output / 'result.json', {'schemaVersion': 'agap-qwn-gpu-result/v1', 'status': 'completed', 'modelExecuted': True,
                  'variants': results, 'promotion': 'not_promoted', 'independentEvaluationReady': False})
        return {'status': 'completed', 'bothCanonicalOutputs': all(r['completeCanonicalOutput'] for r in results.values()), 'promotion': 'not_promoted'}
    except Exception as error:
        write_new(output / 'failure.json', {'status': 'failed', 'exceptionType': type(error).__name__,
                  'modelExecutionCompleted': False, 'promotion': 'not_promoted'})
        raise EvidenceError('GPU attempt failed; preserve partial outputs and failure.json; no successful verification claimed') from error
