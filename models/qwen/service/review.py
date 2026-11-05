"""Source-text validation, not financial-semantic or authenticity verification.

Schemas are generated from the canonical TypeScript contracts. Downloaded Python
and bytecode are never imported. Invalid model content is never returned.
"""
from pathlib import Path
import re
from ..handoff.files import EvidenceError, loads, read_json, require
from ..handoff.schema import validate

HERE = Path(__file__).resolve().parent
RESULT_SCHEMA = read_json(HERE / 'review.schema.json')
INPUT_SCHEMA = read_json(HERE / 'review-input.schema.json')
PAYLOAD_SCHEMA = RESULT_SCHEMA['oneOf'][0]['properties']['payload']
DECISION = re.compile(r'\b(?:loan|application)\s+(?:is\s+)?(?:approved|denied|rejected)\b|'
                      r'\b(?:approve|deny|reject)\s+(?:the\s+)?(?:loan|application)\b', re.I)


def validate_input(value):
    validate(value, INPUT_SCHEMA)
    require(value['question'].strip() and all(source['quote'].strip() for source in value['sources']), 'Empty review text')
    require(len({source['source_id'] for source in value['sources']}) == len(value['sources']), 'Duplicate review source')
    return value


def reject(reason, attempts=None):
    result = {'status': 'REJECT_AND_ESCALATE', 'reasons': [reason], 'payload': None,
              'financial_semantics_verified': False, 'loan_decision_permitted': False}
    if attempts is not None:
        result['attempts_used'] = attempts
    validate(result, RESULT_SCHEMA)
    return result


def screen(raw, sources, attempts=1):
    try:
        require(isinstance(raw, str) and len(raw) <= 30_000, 'Output is not bounded text')
        payload = loads(raw)
        validate(payload, PAYLOAD_SCHEMA)
        require(not DECISION.search(payload['finding'] + ' ' + payload['clarification_question']), 'Prohibited lending decision')
        index = {source['source_id']: source['quote'] for source in sources}
        for evidence in payload['evidence']:
            require(evidence['quote'].strip() and evidence['source_id'] in index
                    and evidence['quote'] in index[evidence['source_id']], 'Unsupported exact citation')
        result = {'status': 'REQUIRES_HUMAN_REVIEW', 'reasons': [], 'payload': payload,
                  'source_text_match_verified': True, 'financial_semantics_verified': False,
                  'loan_decision_permitted': False, 'attempts_used': attempts}
        validate(result, RESULT_SCHEMA)
        return result
    except (EvidenceError, ValueError, TypeError, KeyError):
        return reject('invalid_or_unsupported_model_output', attempts)


def messages(prompt, question, sources, repair=False):
    segments = [f"Attachment <{source['source_id']}>\n{source['quote']}" for source in sources]
    task = ('Question: ' + question + '\n\nDocument excerpts (fictional; not independently verified):\n'
            + '\n'.join(segments) + '\n\nDo not infer authenticity, eligibility, or institutional policy.')
    if repair:
        task += ('\n\nFORMAT RETRY: Your previous answer failed deterministic output checks. '
                 'Return only the required six-field JSON. Copy every citation EXACTLY as a substring '
                 'from its actual attachment; never invent or alter quoted text. Never make loan decisions.')
    return [{'role': 'system', 'content': [{'type': 'text', 'text': prompt}]},
            {'role': 'user', 'content': [{'type': 'text', 'text': task}]}]
