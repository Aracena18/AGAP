"""One private offline process; baseline extraction and untrusted Experiment F review.

Candidates are explicitly unapproved, fictional only, and denied in production.
No downloaded code, database access, financial tools or lending authority.
"""
from contextlib import nullcontext
import hmac
import importlib.metadata
import json
import os
from pathlib import Path
import re
import sys
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from threading import Lock, Timer
import time
from models.qwen.handoff.files import EvidenceError, file_under, loads, read_json, require, sha256
from models.qwen.handoff.schema import validate
from models.qwen.service.review import messages, reject, screen, validate_input

HERE = Path(__file__).resolve().parent
QWEN = HERE.parent


class InferenceFailure(ValueError):
    pass


def checked_json(path, expected):
    require(isinstance(expected, str) and len(expected) == 64 and sha256(path) == expected, 'Configuration checksum mismatch')
    return read_json(path)


def load_bindings(env):
    """Pure stdlib configuration checks; never synthesize release approval."""
    identity = read_json(QWEN / 'experiment_f/identity.json')
    baseline = read_json(QWEN / 'model_manifest.json')
    candidate = bool(env.get('QWEN_FICTIONAL_CANDIDATE_FILE') or env.get('QWEN_FICTIONAL_CANDIDATE_SHA256'))
    if candidate:
        require(env.get('NODE_ENV') != 'production' and env.get('EVIDENCE_RECORD_MODE') == 'fictional'
                and env.get('FICTIONAL_PILOT_ENABLED') == 'true', 'Candidate requires fictional development pilot')
        require(not env.get('QWEN_RELEASE_FILE') and not env.get('QWEN_RELEASE_SHA256'), 'Ambiguous model configuration')
        record = checked_json(env['QWEN_FICTIONAL_CANDIDATE_FILE'], env['QWEN_FICTIONAL_CANDIDATE_SHA256'])
        require(set(record) == {'schemaVersion', 'approved', 'fictionalOnly', 'scope', 'extractionArtifact', 'reviewArtifact'}
                and record['schemaVersion'] == 'agap-fictional-model-candidate/v1' and record['approved'] is False
                and record['fictionalOnly'] is True and record['scope'] == 'fictional_human_review_pilot', 'Invalid candidate scope')
        extraction, review = record['extractionArtifact'], record['reviewArtifact']
        require(review.get('artifactSha256') == identity['artifactSha256'], 'Unexpected F adapter')
        for artifact in (extraction, review):
            require(artifact.get('datasetManifestSha256') is None and artifact.get('evaluationReference') == 'fictional-pilot-not-independent-not-promoted', 'Candidate cannot claim accepted evaluation')
    else:
        record = checked_json(env['QWEN_RELEASE_FILE'], env['QWEN_RELEASE_SHA256'])
        require(set(record) == {'approved', 'independentReviewReference', 'realRecordsApproved', 'artifact'}
                and record['approved'] is True and isinstance(record['independentReviewReference'], str)
                and record['independentReviewReference'].strip() and type(record['realRecordsApproved']) is bool, 'An accepted model release is required')
        require(env.get('EVIDENCE_RECORD_MODE') != 'real' or record['realRecordsApproved'], 'Model not released for real records')
        extraction, review = record['artifact'], None
        require(not re.search(r'simulat|not-independent|not-promoted|public-development', extraction.get('evaluationReference', ''), re.I), 'Development preview is not an accepted release')
    require(extraction.get('artifactSha256') is None, 'Baseline extraction cannot attach tuned weights')
    for artifact in (extraction, review):
        if artifact is not None:
            require(set(artifact) == {'baseModel', 'baseRevision', 'artifactSha256', 'promptVersion', 'schemaVersion', 'datasetManifestSha256', 'evaluationReference'}
                    and artifact['baseModel'] == baseline['base_repository'] and artifact['baseRevision'] == baseline['base_revision'], 'Unexpected pinned provenance')
    require(extraction['promptVersion'] == sha256(HERE / 'prompt.txt') and extraction['schemaVersion'] == sha256(HERE / 'finding.schema.json'), 'Extraction prompt/schema binding differs')
    if review:
        require(review['promptVersion'] == sha256(QWEN / 'experiment_f/prompt.txt') and review['schemaVersion'] == sha256(HERE / 'review.schema.json'), 'Review prompt/schema binding differs')
    return {'extraction': extraction, 'review': review, 'candidate': candidate}


def validate_artifacts(env, bindings):
    root = Path(env['QWEN_ARTIFACT_DIRECTORY']).resolve()
    manifest = checked_json(file_under(root, 'model_manifest.json'), env['QWEN_EXPORT_MANIFEST_SHA256'])
    identity = read_json(QWEN / 'experiment_f/identity.json')
    require(manifest['base_repository'] == bindings['extraction']['baseModel'] and manifest['base_revision'] == bindings['extraction']['baseRevision'], 'Artifact base differs')
    if bindings['candidate']:
        require(manifest.get('adapter_sha256') == identity['artifactSha256'], 'F export differs')
    expected_base = {name: entry for name, entry in read_json(QWEN / 'model_manifest.json')['files'].items() if name.startswith('base_model/')}
    require({name: entry for name, entry in manifest['files'].items() if name.startswith('base_model/')} == expected_base, 'Incomplete pinned baseline inventory')
    for name, entry in manifest['files'].items():
        if not bindings['candidate'] and not (name.startswith('base_model/') or name == 'environment_versions.json'):
            continue
        path = file_under(root, name)
        require(path.stat().st_size == entry['bytes'] and sha256(path) == entry['sha256'], 'Artifact checksum mismatch')
    if bindings['candidate']:
        for name, entry in identity['files'].items():
            if name.startswith('adapter/'):
                require(manifest['files'].get(name) == entry, 'Unexpected F adapter metadata')
    versions = read_json(file_under(root, 'environment_versions.json'))
    require(versions == read_json(QWEN / 'environment_versions.json'), 'Runtime recipe differs')
    for package, expected in versions.items():
        require(importlib.metadata.version(package) == expected, 'GPU environment differs from pinned runtime recipe')
    return root


def fatal_timeout():
    # A wedged CUDA kernel cannot be safely canceled by another Python thread.
    # Fail the process; deployment restarts it and the app uses manual fallback.
    sys.stderr.write('{"component":"qwen","code":"generation_deadline_exceeded"}\n')
    sys.stderr.flush()
    os._exit(70)


class GpuModel:
    def __init__(self, root, review_enabled):
        os.environ.update(HF_HUB_OFFLINE='1', TRANSFORMERS_OFFLINE='1')
        from unsloth import FastVisionModel
        import torch
        require(torch.cuda.is_available() and torch.cuda.is_bf16_supported(), 'Actual CUDA BF16 support is required')
        self.torch = torch
        self.model, self.processor = FastVisionModel.from_pretrained(model_name=str(root / 'base_model'), load_in_4bit=False,
            dtype=torch.bfloat16, local_files_only=True, trust_remote_code=False)
        self.tokenizer = getattr(self.processor, 'tokenizer', self.processor)
        FastVisionModel.for_inference(self.model)
        self.model.eval()
        self.review_enabled = False
        self.base_disabled_parity = None
        if review_enabled:
            self.attach_review(root)
        for parameter in self.model.parameters():
            parameter.requires_grad_(False)

    def attach_review(self, root):
        """Allows offline same-task clean-base measurement before attachment."""
        from peft import PeftModel
        from unsloth import FastVisionModel
        require(not self.review_enabled, 'Adapter already attached')
        # PEFT mutates its base: a second Python alias is not isolation.
        probe = self.tokenizer('FICTIONAL model readiness.', return_tensors='pt')
        probe = {key: value.to(next(self.model.parameters()).device) for key, value in probe.items()}
        with self.torch.inference_mode():
            clean = self.model.generate(**probe, max_new_tokens=8, do_sample=False)
        self.model = PeftModel.from_pretrained(self.model, str(root / 'adapter'), is_trainable=False, local_files_only=True)
        FastVisionModel.for_inference(self.model)
        self.model.eval()
        with self.model.disable_adapter(), self.torch.inference_mode():
            disabled = self.model.generate(**probe, max_new_tokens=8, do_sample=False)
        require(self.torch.equal(clean, disabled), 'Clean-base and disabled-adapter readiness probe differs')
        self.base_disabled_parity, self.review_enabled = True, True
        del clean, disabled, probe
        self.check_adapter()

    def check_adapter(self):
        if self.review_enabled:
            status = self.model.get_model_status()
            require(status.enabled is True and not status.merged_adapters, 'Unexpected or merged adapter state')

    def generate(self, capability, request, deadline, repair=False):
        if time.monotonic() >= deadline:
            raise InferenceFailure('generation_timeout')
        self.check_adapter()
        if capability in ('review', 'review_baseline'):
            prompt = (QWEN / 'experiment_f/prompt.txt').read_text().removesuffix('\n')
            inputs = self.processor.apply_chat_template(messages(prompt, request['question'], request['sources'], repair),
                tokenize=True, add_generation_prompt=True, return_dict=True, return_tensors='pt')
            count = int(inputs['input_ids'].shape[-1])
            inputs = inputs.to(next(self.model.parameters()).device)
            input_limit, output_limit = 1536, 384
        else:
            prompt, schema = (HERE / 'prompt.txt').read_text(), (HERE / 'finding.schema.json').read_text()
            rendered = self.tokenizer.apply_chat_template([
                {'role': 'system', 'content': prompt + '\nExact JSON schema:\n' + schema},
                {'role': 'user', 'content': json.dumps({'page': request['page'], 'untrusted_document_text': request['text']})}],
                tokenize=False, add_generation_prompt=True, enable_thinking=False)
            inputs = self.tokenizer(rendered, return_tensors='pt', add_special_tokens=False)
            count = int(inputs['input_ids'].shape[-1])
            inputs = {key: value.to(next(self.model.parameters()).device) for key, value in inputs.items()}
            input_limit, output_limit = 4096, 2048
        if count > input_limit:
            raise InferenceFailure('input_over_limit')
        with (self.model.disable_adapter() if self.review_enabled and capability != 'review' else nullcontext()), self.torch.inference_mode():
            generated = self.model.generate(**inputs, max_new_tokens=output_limit, do_sample=False, num_beams=1,
                max_time=max(0.01, deadline - time.monotonic()))
        tail = generated[0, count:]
        if time.monotonic() > deadline:
            raise InferenceFailure('generation_timeout')
        eos = self.model.generation_config.eos_token_id or self.tokenizer.eos_token_id
        eos = eos if isinstance(eos, (tuple, list)) else [eos]
        if not len(tail) or len(tail) >= output_limit or tail[-1].item() not in eos:
            raise InferenceFailure('incomplete_generation')
        self.check_adapter()
        return self.tokenizer.decode(tail, skip_special_tokens=True)


class InferenceService:
    def __init__(self, bindings, model):
        self.bindings, self.model, self.busy = bindings, model, Lock()
        self.finding_schema = read_json(HERE / 'finding.schema.json')

    def execute(self, capability, request):
        expected = self.bindings['review' if capability == 'review' else 'extraction']
        require(expected is not None and isinstance(request, dict) and request.get('provenance') == expected, 'Unexpected capability provenance')
        if capability == 'review':
            require(set(request) == {'question', 'sources', 'provenance'}, 'Unexpected review fields')
            validate_input({key: request[key] for key in ('question', 'sources')})
        else:
            require(set(request) == {'page', 'text', 'provenance'} and type(request['page']) is int and 1 <= request['page'] <= 20
                    and isinstance(request['text'], str) and 1 <= len(request['text']) <= 2000, 'Invalid bounded extraction request')
        deadline = time.monotonic() + 90
        watchdog = Timer(95, fatal_timeout)
        watchdog.daemon = True
        watchdog.start()
        try:
            for attempt in range(1, 3 if capability == 'review' else 2):
                try:
                    raw = self.model.generate(capability, request, deadline, repair=attempt > 1)
                except InferenceFailure as error:
                    if capability == 'review':
                        return reject(str(error), attempt)
                    raise
                if capability == 'review':
                    result = screen(raw, request['sources'], attempt)
                    if result['status'] == 'REQUIRES_HUMAN_REVIEW':
                        return result
                else:
                    result = loads(raw)
                    require(isinstance(result, list) and len(result) <= 30, 'Invalid extraction output')
                    validate(result, self.finding_schema)
                    for finding in result:
                        require(finding['page'] == request['page'] and finding['excerpt'] in request['text'], 'Unsupported extraction citation')
                    return result
            return result
        finally:
            watchdog.cancel()


def handler_for(service, token):
    class Handler(BaseHTTPRequestHandler):
        def log_message(self, *_args):
            pass

        def reply(self, status, data):
            body = json.dumps(data, allow_nan=False).encode()
            self.send_response(status)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Cache-Control', 'no-store')
            self.send_header('Content-Length', str(len(body)))
            self.end_headers()
            self.wfile.write(body)

        def authorized(self):
            return hmac.compare_digest(self.headers.get('Authorization', '').encode('utf-8'), ('Bearer ' + token).encode('utf-8'))

        def do_GET(self):
            if not self.authorized() or self.path not in ('/readyz', '/healthz'):
                self.reply(403, {'error': 'forbidden'})
                return
            self.reply(200, {'ready': True, 'capabilities': {'extraction': True, 'review': service.bindings['review'] is not None},
                'fictionalCandidate': service.bindings['candidate'], 'baseDisabledParity': service.model.base_disabled_parity})

        def do_POST(self):
            self.connection.settimeout(10)
            if self.path not in ('/extract', '/review') or not self.authorized():
                self.reply(403, {'error': 'forbidden'})
                return
            if not service.busy.acquire(blocking=False):
                self.reply(429, {'error': 'busy'})
                return
            try:
                size = int(self.headers.get('Content-Length', '0'))
                require(1 <= size <= (100_000 if self.path == '/review' else 16_384), 'Input byte budget exceeded')
                request = loads(self.rfile.read(size).decode('utf-8'))
                self.reply(200, service.execute(self.path[1:], request))
            except (EvidenceError, ValueError, KeyError, TypeError, UnicodeError, RuntimeError):
                self.reply(422, {'error': 'inference_unavailable'})
            finally:
                service.busy.release()
    return Handler


def main():
    token = os.environ['QWEN_SERVICE_TOKEN']
    require(len(token) >= 32, 'A private service token is required')
    bindings = load_bindings(os.environ)
    root = validate_artifacts(os.environ, bindings)
    startup = Timer(600, fatal_timeout)
    startup.daemon = True
    startup.start()
    try:
        model = GpuModel(root, bindings['review'] is not None)
    finally:
        startup.cancel()
    service = InferenceService(bindings, model)
    ThreadingHTTPServer((os.environ.get('QWEN_BIND', '127.0.0.1'), int(os.environ.get('QWEN_PORT', '8080'))), handler_for(service, token)).serve_forever()


if __name__ == '__main__':
    main()
