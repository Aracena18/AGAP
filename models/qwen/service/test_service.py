"""Simulated parser/config/HTTP checks. These do not execute or evaluate Qwen."""
import copy
from http.client import HTTPConnection
from http.server import ThreadingHTTPServer
import json
from pathlib import Path
import tempfile
from threading import Thread
import unittest

from ..handoff.files import EvidenceError, sha256
from ..import_f import candidate
from .review import messages, screen, validate_input
from .server import InferenceFailure, InferenceService, handler_for, load_bindings

SOURCES = [{'source_id': 'source-1-v1', 'quote': 'FICTIONAL stated net income PHP 3,450.'},
           {'source_id': 'source-2-v1', 'quote': 'FICTIONAL stated net income PHP 3,920.'}]
PAYLOAD = {'issue_code': 'SOURCE_CONFLICT', 'evidence': [{'source_id': 'source-1-v1', 'quote': SOURCES[0]['quote'],
           'verification_status': 'source_asserted_not_independently_verified'}], 'finding': 'Clarify the applicable periods.',
           'clarification_question': 'Which period applies?', 'review_status': 'requires_human_review', 'loan_decision': None}


class FakeModel:
    base_disabled_parity = True
    def __init__(self, outputs):
        self.outputs, self.calls = iter(outputs), []
    def generate(self, capability, request, deadline, repair=False):
        self.calls.append((capability, copy.deepcopy(request), repair))
        output = next(self.outputs)
        if isinstance(output, Exception):
            raise output
        return output


class ServiceTests(unittest.TestCase):
    def setUp(self):
        self.temporary = tempfile.TemporaryDirectory()
        self.addCleanup(self.temporary.cleanup)
        info = candidate(self.temporary.name)
        self.env = {'NODE_ENV': 'test', 'EVIDENCE_RECORD_MODE': 'fictional', 'FICTIONAL_PILOT_ENABLED': 'true',
                    'QWEN_FICTIONAL_CANDIDATE_FILE': info['candidateFile'], 'QWEN_FICTIONAL_CANDIDATE_SHA256': info['candidateSha256']}
        self.bindings = load_bindings(self.env)
        self.request = {'question': 'Find discrepancies in fictional excerpts.', 'sources': SOURCES,
                        'provenance': self.bindings['review']}

    def test_candidate_is_unapproved_and_forbidden_in_real_or_production(self):
        record = json.loads(Path(self.env['QWEN_FICTIONAL_CANDIDATE_FILE']).read_text())
        self.assertIs(record['approved'], False)
        for key, value in [('NODE_ENV', 'production'), ('EVIDENCE_RECORD_MODE', 'real'), ('FICTIONAL_PILOT_ENABLED', 'false'), ('QWEN_RELEASE_FILE', 'conflicting')]:
            with self.subTest(key=key), self.assertRaises(EvidenceError):
                load_bindings({**self.env, key: value})

    def test_tampered_candidate_never_loads(self):
        with self.assertRaises(EvidenceError):
            load_bindings({**self.env, 'QWEN_FICTIONAL_CANDIDATE_SHA256': '0' * 64})
        path = Path(self.env['QWEN_FICTIONAL_CANDIDATE_FILE'])
        value = json.loads(path.read_text()); value['approved'] = True; path.write_text(json.dumps(value))
        with self.assertRaises(EvidenceError):
            load_bindings({**self.env, 'QWEN_FICTIONAL_CANDIDATE_SHA256': sha256(path)})

    def test_actual_source_text_only_and_no_financial_semantic_claim(self):
        result = screen(json.dumps(PAYLOAD), SOURCES)
        self.assertEqual(result['status'], 'REQUIRES_HUMAN_REVIEW')
        self.assertFalse(result['financial_semantics_verified'])
        self.assertFalse(result['loan_decision_permitted'])
        for change in ({'quote': 'invented'}, {'source_id': 'not-submitted'}, {'verification_status': 'verified'}):
            payload = copy.deepcopy(PAYLOAD); payload['evidence'][0].update(change)
            self.assertIsNone(screen(json.dumps(payload), SOURCES)['payload'])

    def test_duplicate_json_unknown_fields_and_decisions_are_rejected(self):
        for raw in ('{"issue_code":"NO_ISSUE","issue_code":"SOURCE_CONFLICT"}', 'NaN', '[]', '```json\n{}\n```'):
            self.assertEqual(screen(raw, SOURCES)['status'], 'REJECT_AND_ESCALATE')
        for change in ({'loan_decision': 'approve'}, {'finding': 'Approve the loan.'}, {'amountCentavos': 345000}):
            self.assertIsNone(screen(json.dumps({**PAYLOAD, **change}), SOURCES)['payload'])

    def test_duplicate_empty_and_oversized_sources_fail_before_generation(self):
        for sources in ([SOURCES[0], SOURCES[0]], [{'source_id': 's', 'quote': ' '}], SOURCES * 7):
            with self.assertRaises(EvidenceError):
                validate_input({'question': 'Review fictional excerpts.', 'sources': sources})

    def test_one_format_retry_and_then_rejection_preserves_no_raw_content(self):
        model = FakeModel(['UNSAFE raw unvalidated text', '{}'])
        result = InferenceService(self.bindings, model).execute('review', self.request)
        self.assertEqual(len(model.calls), 2)
        self.assertFalse(model.calls[0][2]); self.assertTrue(model.calls[1][2])
        self.assertEqual(result['attempts_used'], 2); self.assertIsNone(result['payload'])
        self.assertNotIn('UNSAFE', json.dumps(result))

    def test_second_attempt_can_succeed_with_original_sources(self):
        model = FakeModel(['{}', json.dumps(PAYLOAD)])
        result = InferenceService(self.bindings, model).execute('review', self.request)
        self.assertEqual(result['status'], 'REQUIRES_HUMAN_REVIEW')
        self.assertEqual(model.calls[1][1]['sources'], SOURCES)

    def test_timeout_overflow_and_incomplete_output_never_retry_or_truncate(self):
        for code in ('generation_timeout', 'input_over_limit', 'incomplete_generation'):
            model = FakeModel([InferenceFailure(code)])
            result = InferenceService(self.bindings, model).execute('review', self.request)
            self.assertEqual(result['reasons'], [code]); self.assertEqual(len(model.calls), 1)

    def test_review_does_not_accept_extraction_provenance(self):
        with self.assertRaises(EvidenceError):
            InferenceService(self.bindings, FakeModel([])).execute('review', {**self.request, 'provenance': self.bindings['extraction']})

    def test_extraction_and_review_use_separate_tasks_and_provenance(self):
        model = FakeModel(['[]', json.dumps(PAYLOAD), '[]'])
        service = InferenceService(self.bindings, model)
        request = {'page': 1, 'text': 'FICTIONAL no financial amounts.', 'provenance': self.bindings['extraction']}
        self.assertEqual(service.execute('extract', request), [])
        self.assertEqual(service.execute('review', self.request)['status'], 'REQUIRES_HUMAN_REVIEW')
        self.assertEqual(service.execute('extract', request), [])
        self.assertEqual([row[0] for row in model.calls], ['extract', 'review', 'extract'])

    def test_nonempty_extraction_validates_array_schema_and_exact_citation(self):
        text = 'FICTIONAL net pay PHP 2000.00'
        finding = {'page': 1, 'excerpt': text, 'fact': {
            'factId': None, 'relevance': 'included', 'label': 'Stated net pay', 'category': 'income',
            'value': {'availability': 'recorded', 'amountCentavos': 200000},
            'sourceId': None, 'sourceVersion': None, 'statement': None, 'effectiveDate': None,
            'coverageStart': None, 'coverageEnd': None, 'cashDates': [], 'period': 'unknown',
            'basis': 'net', 'deduction': 'unknown', 'reason': 'Fictional, unverified suggestion.'}}
        request = {'page': 1, 'text': text, 'provenance': self.bindings['extraction']}
        service = InferenceService(self.bindings, FakeModel([json.dumps([finding])]))
        self.assertEqual(service.execute('extract', request), [finding])
        for change in ({'page': 2}, {'excerpt': 'unsupported source'}, {'unexpected': True},
                       {'fact': {**finding['fact'], 'value': {'availability': 'recorded', 'amountCentavos': -1}}}):
            with self.subTest(change=change), self.assertRaises(EvidenceError):
                InferenceService(self.bindings, FakeModel([json.dumps([{**finding, **change}])])).execute('extract', request)

    def test_prompt_preserves_cross_source_bundle_exactly_and_treats_documents_as_data(self):
        prompt = messages('system prompt', self.request['question'], SOURCES)
        for source in SOURCES:
            self.assertIn('Attachment <' + source['source_id'] + '>\n' + source['quote'], prompt[1]['content'][0]['text'])

    def test_http_auth_readiness_busy_and_lock_recovery(self):
        token = 'fictional-private-token-at-least-32-chars'
        service = InferenceService(self.bindings, FakeModel([RuntimeError('private output'), json.dumps(PAYLOAD)]))
        http = ThreadingHTTPServer(('127.0.0.1', 0), handler_for(service, token))
        thread = Thread(target=http.serve_forever, daemon=True); thread.start()
        self.addCleanup(http.server_close); self.addCleanup(http.shutdown)
        def call(path, body=None, authorized=True):
            connection = HTTPConnection(*http.server_address, timeout=5)
            headers = {'Authorization': 'Bearer ' + token} if authorized else {}
            connection.request('POST' if body is not None else 'GET', path, None if body is None else json.dumps(body), headers)
            response = connection.getresponse(); value = (response.status, json.loads(response.read())); connection.close(); return value
        self.assertEqual(call('/readyz', authorized=False)[0], 403)
        self.assertTrue(call('/readyz')[1]['baseDisabledParity'])
        service.busy.acquire()
        try:
            self.assertEqual(call('/review', self.request)[0], 429)
        finally:
            service.busy.release()
        status, value = call('/review', self.request)
        self.assertEqual(status, 422); self.assertNotIn('private output', json.dumps(value))
        self.assertEqual(call('/review', self.request)[1]['status'], 'REQUIRES_HUMAN_REVIEW')


if __name__ == '__main__':
    unittest.main()
