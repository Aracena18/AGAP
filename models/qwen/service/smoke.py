"""Bounded actual HTTP smoke; no simulated model outputs or promotion claim."""
import argparse
import json
import os
from pathlib import Path
import urllib.error
import urllib.parse
import urllib.request
from ..handoff.files import read_json, require, sha256, write_new


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--endpoint', default='http://127.0.0.1:8080')
    parser.add_argument('--candidate', required=True)
    parser.add_argument('--output', required=True)
    args = parser.parse_args()
    endpoint = urllib.parse.urlparse(args.endpoint)
    require(endpoint.scheme == 'https' or endpoint.scheme == 'http' and endpoint.hostname in ('localhost', '127.0.0.1'), 'Private HTTPS or loopback endpoint required')
    require(not endpoint.username and not endpoint.password and not endpoint.query and not endpoint.fragment, 'Invalid endpoint')
    token = os.environ['QWEN_SERVICE_TOKEN']
    require(len(token) >= 32, 'Private token required')
    candidate = read_json(args.candidate)
    require(candidate.get('approved') is False and candidate.get('fictionalOnly') is True, 'Fictional candidate required')
    output = Path(args.output)
    require(not output.exists(), 'Refusing to overwrite prior smoke')
    output.mkdir(parents=True)
    write_new(output / 'binding.json', {'candidateSha256': sha256(args.candidate), 'origin': 'actual_private_http', 'scope': 'fictional_development_smoke_not_independent'})
    requests = [('ready', '/readyz', None),
        ('extract-before', '/extract', {'page': 1, 'text': 'FICTIONAL net pay PHP 2000.00', 'provenance': candidate['extractionArtifact']}),
        ('review', '/review', {'question': 'Identify discrepancies without deciding eligibility.',
            'sources': [{'source_id': 'fictional-1', 'quote': 'FICTIONAL total PHP 3,450.00.'}, {'source_id': 'fictional-2', 'quote': 'FICTIONAL total PHP 3,920.00.'}],
            'provenance': candidate['reviewArtifact']}),
        ('extract-after', '/extract', {'page': 1, 'text': 'FICTIONAL net pay PHP 2000.00', 'provenance': candidate['extractionArtifact']})]
    responses = {}
    for name, path, body in requests:
        request = urllib.request.Request(args.endpoint.rstrip('/') + path, data=json.dumps(body).encode() if body else None,
            headers={'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json'})
        try:
            with urllib.request.urlopen(request, timeout=100) as response:
                raw = response.read(100_001)
                require(len(raw) <= 100_000, 'Oversized service response')
                responses[name] = json.loads(raw)
                write_new(output / (name + '.json'), {'request': body, 'response': responses[name], 'httpStatus': response.status})
        except (urllib.error.URLError, ValueError) as error:
            write_new(output / (name + '.failure.json'), {'code': 'private_inference_unavailable', 'exceptionType': type(error).__name__})
            parser.exit(2, 'Actual private inference unavailable; preserve failure evidence and manual fallback.\n')
    result = {'origin': 'actual_private_http', 'scope': 'fictional_development_smoke_not_independent',
        'ready': responses['ready'].get('ready') is True, 'baseDisabledParity': responses['ready'].get('baseDisabledParity'),
        'extractionStableAcrossReview': responses['extract-before'] == responses['extract-after'],
        'reviewStatus': responses['review'].get('status'), 'semanticCorrectness': 'not_independently_evaluated', 'promotion': 'not_promoted'}
    write_new(output / 'result.json', result)
    print(json.dumps(result, indent=2))
    if not result['ready'] or not result['extractionStableAcrossReview'] or result['reviewStatus'] != 'REQUIRES_HUMAN_REVIEW':
        parser.exit(2, 'Actual capability smoke did not pass; preserve results and use human/manual fallback.\n')


if __name__ == '__main__':
    main()
