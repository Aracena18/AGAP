"""Guard tests only; these do not run/evaluate model weights."""
from argparse import Namespace
import json
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch

from models.qwen.handoff.files import EvidenceError, sha256
from models.qwen.import_f import candidate
from models.qwen.service.cpu_probe import PINS, run, settings
from models.qwen.service.test_service import PAYLOAD


class CpuProbeGuards(unittest.TestCase):
    def setUp(self):
        self.directory = tempfile.TemporaryDirectory()
        self.addCleanup(self.directory.cleanup)
        value = candidate(self.directory.name)
        self.args = Namespace(allow_unapproved_fictional_cpu=True, threads=4, seconds=600,
                              candidate=value['candidateFile'], candidate_sha256=value['candidateSha256'])

    def test_explicit_experiment_keeps_existing_unapproved_provenance(self):
        result = settings(self.args)
        self.assertTrue(result['candidate'])
        self.assertEqual(result['review']['evaluationReference'], 'fictional-pilot-not-independent-not-promoted')

    def test_requires_explicit_cpu_choice_and_bounded_generation(self):
        for field, value in [('allow_unapproved_fictional_cpu', False), ('threads', 0), ('threads', 5),
                             ('seconds', 29), ('seconds', 601)]:
            with self.subTest(field=field, value=value), self.assertRaises(EvidenceError):
                settings(Namespace(**{**vars(self.args), field: value}))

    def test_rejects_tampered_or_claimed_approved_candidate(self):
        with self.assertRaises(EvidenceError):
            settings(Namespace(**{**vars(self.args), 'candidate_sha256': '0' * 64}))
        path = Path(self.args.candidate)
        value = json.loads(path.read_text())
        value['approved'] = True
        path.write_text(json.dumps(value))
        self.args.candidate_sha256 = sha256(path)
        with self.assertRaises(EvidenceError):
            settings(self.args)

    def test_review_only_cannot_claim_full_extraction_switching(self):
        class ReviewOnlyModel:
            base_disabled_parity = True
            def __init__(self, *_):
                self.attached = False
            def attach_review(self, _):
                self.attached = True
            def generate(self, capability, request, _, repair=False):
                assert self.attached and capability == 'review'
                if not repair:
                    return '{}'
                payload = {**PAYLOAD, 'evidence': [{**PAYLOAD['evidence'][0],
                    **request['sources'][0]}]}
                return json.dumps(payload)
        args = Namespace(**vars(self.args), review_only=True, artifacts=self.directory.name,
                         output=str(Path(self.directory.name) / 'evidence'), manifest_sha256='test')
        with patch('models.qwen.service.cpu_probe.verify', return_value={'verified': True}), \
             patch('models.qwen.service.cpu_probe.importlib.metadata.version', side_effect=PINS.__getitem__):
            result = run(args, ReviewOnlyModel)
        self.assertEqual(result['scope'], 'review_only')
        self.assertIsNone(result['extractionStableAcrossReview'])
        self.assertFalse(result['httpApplicationIntegrationTested'])
        self.assertEqual(list(result['metrics']), ['review-f'])
        evidence = Path(args.output)
        self.assertEqual(json.loads((evidence / 'review-f.screened.json').read_text())['status'], 'REJECT_AND_ESCALATE')
        self.assertEqual(json.loads((evidence / 'review-f-retry.screened.json').read_text())['status'], 'REQUIRES_HUMAN_REVIEW')


if __name__ == '__main__':
    unittest.main()
