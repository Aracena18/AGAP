"""Private, bounded pretrained baseline service. No training or lending decisions.
Offline artifact verification reuses the original handoff. TLS/private ingress is
supplied by the deployment; this process must never have public ingress.
"""
import hashlib
import hmac
import importlib.metadata
import json
import os
from pathlib import Path
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from threading import Lock
from models.qwen.handoff.files import file_under, sha256


def main():
    token = os.environ['QWEN_SERVICE_TOKEN']
    if len(token) < 32:
        raise ValueError('A private service token is required')
    release_bytes = Path(os.environ['QWEN_RELEASE_FILE']).read_bytes()
    if hashlib.sha256(release_bytes).hexdigest() != os.environ['QWEN_RELEASE_SHA256']:
        raise ValueError('Release checksum mismatch')
    release = json.loads(release_bytes)
    artifact = release['artifact']
    root = Path(os.environ['QWEN_ARTIFACT_DIRECTORY']).resolve()
    export_sha = os.environ['QWEN_EXPORT_MANIFEST_SHA256']
    manifest_path = file_under(root, 'model_manifest.json')
    if sha256(manifest_path) != export_sha:
        raise ValueError('Export manifest checksum mismatch')
    manifest = json.loads(manifest_path.read_text())
    baseline_files = {name: entry for name, entry in manifest['files'].items() if name.startswith('base_model/')}
    if not baseline_files or not any(name.endswith('.safetensors') for name in baseline_files):
        raise ValueError('A complete baseline weight manifest is required')
    for name, entry in baseline_files.items():
        path = file_under(root, name)
        if path.stat().st_size != entry['bytes'] or sha256(path) != entry['sha256']:
            raise ValueError('Pretrained baseline file commitment mismatch')
    if sha256(file_under(root, 'environment_versions.json')) != manifest['files']['environment_versions.json']['sha256']:
        raise ValueError('Runtime version commitment mismatch')
    # A tuned artifact is intentionally not enabled by this milestone.
    if artifact['artifactSha256'] is not None or artifact['baseModel'] != manifest['base_repository'] or artifact['baseRevision'] != manifest['base_revision']:
        raise ValueError('Only the checksum-bound pretrained baseline is enabled')
    versions = json.loads((root / 'environment_versions.json').read_text())
    for package, expected in versions.items():
        if importlib.metadata.version(package) != expected:
            raise ValueError('GPU environment differs from the pinned export')
    os.environ.update(HF_HUB_OFFLINE='1', TRANSFORMERS_OFFLINE='1')
    from unsloth import FastVisionModel
    import torch
    if not torch.cuda.is_available() or not torch.cuda.is_bf16_supported():
        raise ValueError('Actual CUDA BF16 support is required')
    model, processor = FastVisionModel.from_pretrained(model_name=str(root / 'base_model'), load_in_4bit=False, dtype=torch.bfloat16, local_files_only=True, trust_remote_code=False)
    FastVisionModel.for_inference(model)
    model.eval()
    for parameter in model.parameters():
        parameter.requires_grad_(False)
    tokenizer = getattr(processor, 'tokenizer', processor)
    prompt = Path(__file__).with_name('prompt.txt').read_text()
    schema = Path(__file__).with_name('finding.schema.json').read_text()
    if artifact['promptVersion'] != hashlib.sha256(prompt.encode()).hexdigest() or artifact['schemaVersion'] != hashlib.sha256(schema.encode()).hexdigest():
        raise ValueError('The deployed prompt/schema differs from its evaluation')
    busy = Lock()

    class Handler(BaseHTTPRequestHandler):
        def log_message(self, *_args):
            pass  # Neither financial text nor tokens are logged.

        def reply(self, status, data):
            body = json.dumps(data).encode()
            self.send_response(status)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Cache-Control', 'no-store')
            self.send_header('Content-Length', str(len(body)))
            self.end_headers()
            self.wfile.write(body)

        def do_POST(self):
            self.connection.settimeout(10)
            if self.path != '/extract' or not hmac.compare_digest(self.headers.get('Authorization', ''), 'Bearer ' + token):
                self.reply(403, {'error': 'forbidden'})
                return
            if not busy.acquire(blocking=False):
                self.reply(429, {'error': 'busy'})
                return
            try:
                size = int(self.headers.get('Content-Length', '0'))
                if not 1 <= size <= 16384:
                    raise ValueError('Input budget exceeded')
                request = json.loads(self.rfile.read(size))
                if set(request) != {'text', 'page', 'provenance'} or request['provenance'] != artifact or not isinstance(request['text'], str) or not 1 <= len(request['text']) <= 2000 or not isinstance(request['page'], int) or not 1 <= request['page'] <= 20:
                    raise ValueError('Invalid bounded request')
                messages = [{'role': 'system', 'content': prompt + '\nExact JSON schema:\n' + schema}, {'role': 'user', 'content': json.dumps({'page': request['page'], 'untrusted_document_text': request['text']})}]
                rendered = tokenizer.apply_chat_template(messages, tokenize=False, add_generation_prompt=True, enable_thinking=False)
                tokens = tokenizer(rendered, return_tensors='pt', add_special_tokens=False)
                count = tokens['input_ids'].shape[-1]
                if count > 4096:
                    raise ValueError('Token budget exceeded; truncation is prohibited')
                tokens = {k: v.to(next(model.parameters()).device) for k, v in tokens.items()}
                with torch.inference_mode():
                    generated = model.generate(**tokens, max_new_tokens=2048, max_time=90, do_sample=False)
                tail = generated[0, count:]
                if len(tail) >= 2048 or not len(tail) or tail[-1].item() != tokenizer.eos_token_id:
                    raise ValueError('Generation did not complete within budget')
                result = json.loads(tokenizer.decode(tail, skip_special_tokens=True))
                if not isinstance(result, list) or len(result) > 30:
                    raise ValueError('Invalid output')
                self.reply(200, result)  # Node adapter independently validates exact schema and citations.
            except Exception:
                self.reply(422, {'error': 'extraction_unavailable'})
            finally:
                busy.release()

    ThreadingHTTPServer((os.environ.get('QWEN_BIND', '127.0.0.1'), int(os.environ.get('QWEN_PORT', '8080'))), Handler).serve_forever()


if __name__ == '__main__':
    main()
