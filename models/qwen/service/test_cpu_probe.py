"""Guard tests only; these do not run/evaluate model weights."""
from argparse import Namespace
import json
from pathlib import Path
import tempfile
import unittest

from models.qwen.handoff.files import EvidenceError, sha256
from models.qwen.import_f import candidate
from models.qwen.service.cpu_probe import settings


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


if __name__ == '__main__':
    unittest.main()
