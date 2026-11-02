"""Fictional harness only; passing tests are not model execution/evaluation."""
import copy
import importlib.metadata
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch
from .core import prepare, load_inputs, preflight, validate_predictions
from .gpu import run
from ..handoff.files import EvidenceError, read_json, sha256, write_new


class VerificationTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory(); self.addCleanup(self.tmp.cleanup)
        self.root = Path(self.tmp.name); self.preview = self.root / 'producer'; self.preview.mkdir()
        self.inputs = self.root / 'inputs'
        self.rows = [{'caseId': 'fictional-harness', 'instruction': 'FICTIONAL extraction', 'requestedFields': ['income'],
                      'documents': [{'id': 'fixture-source', 'version': 1, 'page': 1, 'documentDate': None, 'text': 'FICTIONAL income 100 centavos.'}]}]
        self.schema = {'type': 'object', 'required': ['field', 'sources', 'action', 'question', 'value', 'relevance'],
                       'properties': {'field': {'type': 'string'}, 'sources': {'type': 'array', 'minItems': 1}, 'action': {'enum': ['extract', 'clarify', 'abstain']},
                                      'question': True, 'value': True, 'relevance': True}, 'additionalProperties': False}
        self.finding = {'field': 'income', 'value': {'availability': 'recorded', 'amountCentavos': 100}, 'action': 'extract',
                        'relevance': 'supported', 'question': None, 'sources': [{'sourceId': 'fixture-source', 'sourceVersion': 1, 'page': 1, 'excerpt': 'income 100'}]}
        self.export = {'base_repository': 'unsloth/Qwen3.5-2B', 'base_revision': '1' * 40, 'adapter_sha256': '2' * 64}
        self.refresh()

    def refresh(self):
        p = self.preview / 'development.inputs.jsonl'
        import json
        p.write_text('\n'.join(json.dumps(r) for r in self.rows) + '\n')
        s = self.preview / 'finding.schema.json'
        if s.exists(): s.unlink()
        write_new(s, self.schema)
        m = {'schemaVersion': 'eval-01-bundle/v1', 'kind': 'development_preview', 'holdout': None, 'review': None,
             'inputCorpusSha256': '3' * 64, 'splits': {'developmentCases': len(self.rows)},
             'artifacts': [{'name': n, 'sha256': sha256(self.preview / n)} for n in ['development.inputs.jsonl', 'finding.schema.json']]}
        p = self.preview / 'manifest.json'
        if p.exists():p.unlink()
        write_new(p, m); self.preview_sha = sha256(p)

    def prepared(self):
        a = prepare(self.preview, self.preview_sha, self.inputs)
        return a['manifestSha256']

    def predictions(self, sha):
        m, _, _ = load_inputs(self.inputs, sha)
        return {'schemaVersion': 'eval-01-predictions/v1', 'inputCorpusSha256': m['inputCorpusSha256'],
                'run': {'id': 'fixture-inference', 'origin': 'model', 'environment': 'FICTIONAL parser fixture, no ML execution', 'artifact': {
                    'baseModel': self.export['base_repository'], 'baseRevision': self.export['base_revision'], 'artifactSha256': self.export['adapter_sha256'],
                    'promptVersion': m['files']['prompt.txt'], 'schemaVersion': m['files']['finding.schema.json'], 'datasetManifestSha256': m['producerManifestSha256'],
                    'evaluationReference': 'public-development-smoke-not-independent'}},
                'cases': [{'caseId': self.rows[0]['caseId'], 'findings': [copy.deepcopy(self.finding)], 'elapsedMs': None, 'peakMemoryBytes': None}]}

    def check(self, sha, value):
        p = self.root / ('predictions-' + str(len(list(self.root.glob('predictions-*')))) + '.json')
        write_new(p, value)
        return validate_predictions(self.inputs, sha, p, self.export)

    def test_prepare_uses_inputs_and_schema_only(self):
        (self.preview / 'development.targets.jsonl').symlink_to('/nonexistent-private-target')
        sha = self.prepared(); _, rows, _ = load_inputs(self.inputs, sha)
        self.assertEqual(rows, self.rows)
        self.assertEqual({p.name for p in self.inputs.iterdir()}, {'manifest.json', 'cases.json', 'finding.schema.json', 'prompt.txt'})

    def test_reject_changed_manifest(self):
        with self.assertRaises(EvidenceError):prepare(self.preview, '0' * 64, self.inputs)

    def test_reject_changed_input_bytes(self):
        (self.preview / 'development.inputs.jsonl').write_text('{}\n')
        with self.assertRaises(EvidenceError): self.prepared()

    def test_reject_repeated_case_ids(self):
        self.rows.append(copy.deepcopy(self.rows[0])); self.refresh()
        with self.assertRaises(EvidenceError): self.prepared()

    def test_reject_hidden_labels(self):
        self.rows[0]['expected'] = [self.finding]; self.refresh()
        with self.assertRaises(EvidenceError): self.prepared()

    def test_reject_nonfictional_source(self):
        self.rows[0]['documents'][0]['text'] = 'Uncleared record'; self.refresh()
        with self.assertRaises(EvidenceError): self.prepared()

    def test_immutable_input_package_and_tampering(self):
        sha = self.prepared()
        with self.assertRaises(EvidenceError): self.prepared()
        (self.inputs / 'prompt.txt').write_text('changed')
        with self.assertRaises(EvidenceError):load_inputs(self.inputs, sha)

    def test_extra_input_file_rejected(self):
        sha = self.prepared();(self.inputs / 'targets.json').write_text('{}')
        with self.assertRaises(EvidenceError):load_inputs(self.inputs, sha)

    def test_valid_fixture_remains_unscored_and_unattested(self):
        sha = self.prepared(); a = self.check(sha, self.predictions(sha))
        self.assertEqual(a['semanticCorrectness'], 'not_evaluated');self.assertFalse(a['executionAttested'])
        self.assertEqual(a['measuredLatencyCases'], 0); self.assertEqual(a['promotion'], 'not_promoted')

    def test_wrong_value_with_valid_citation_is_not_scored_as_truth(self):
        sha = self.prepared(); p = self.predictions(sha); p['cases'][0]['findings'][0]['value']['amountCentavos'] = 999
        self.assertEqual(self.check(sha, p)['semanticCorrectness'], 'not_evaluated')

    def test_bad_source_version_excerpt_and_page_rejected(self):
        sha = self.prepared()
        for key, value in [('sourceVersion', 2), ('page', 2), ('excerpt', 'not present')]:
            p = self.predictions(sha);p['cases'][0]['findings'][0]['sources'][0][key] = value
            with self.assertRaises(EvidenceError):self.check(sha, p)

    def test_duplicate_fields_or_citations_rejected(self):
        sha = self.prepared();p = self.predictions(sha);p['cases'][0]['findings'].append(copy.deepcopy(self.finding))
        with self.assertRaises(EvidenceError):self.check(sha, p)
        p = self.predictions(sha);p['cases'][0]['findings'][0]['sources'] *= 2
        with self.assertRaises(EvidenceError):self.check(sha, p)

    def test_unrequested_field_or_missing_case_rejected(self):
        sha = self.prepared();p = self.predictions(sha);p['cases'][0]['findings'][0]['field'] = 'decision'
        with self.assertRaises(EvidenceError):self.check(sha, p)
        p = self.predictions(sha);p['cases'] = []
        with self.assertRaises(EvidenceError):self.check(sha, p)

    def test_wrong_artifact_and_simulated_origin_rejected(self):
        sha = self.prepared();p = self.predictions(sha);p['run']['artifact']['artifactSha256'] = '9' * 64
        with self.assertRaises(EvidenceError):self.check(sha, p)

    def test_tuned_cannot_pass_as_baseline(self):
        sha = self.prepared(); p = self.predictions(sha); path = self.root / 'variant.json';write_new(path, p)
        with self.assertRaises(EvidenceError):validate_predictions(self.inputs, sha, path, self.export, 'baseline')
        p = self.predictions(sha);p['run']['origin'] = 'simulated'
        with self.assertRaises(EvidenceError):self.check(sha, p)

    def test_invalid_measurements_and_missing_question_rejected(self):
        sha = self.prepared();p = self.predictions(sha);p['cases'][0]['peakMemoryBytes'] = 0.5
        with self.assertRaises(EvidenceError):self.check(sha, p)
        p = self.predictions(sha);f = p['cases'][0]['findings'][0];f['action'] = 'clarify'
        with self.assertRaises(EvidenceError):self.check(sha, p)

    def test_preflight_missing_runtime_is_explicit_and_does_not_import_ml(self):
        with patch('importlib.metadata.version', side_effect=importlib.metadata.PackageNotFoundError), patch('shutil.which', return_value=None):
            p = preflight()
        self.assertFalse(p['readyToAttemptGpuLoad']);self.assertFalse(p['modelExecuted'])
        self.assertEqual(len(p['blockers']), 6)

    def test_blocked_gpu_run_creates_no_success_artifacts(self):
        with patch('models.qwen.verification.gpu.preflight', return_value={'readyToAttemptGpuLoad': False}):
            with self.assertRaises(EvidenceError):run('missing', '0' * 64, 'missing', '0' * 64, self.root / 'run')
        self.assertFalse((self.root / 'run').exists())


if __name__ == '__main__':unittest.main()
