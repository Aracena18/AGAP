"""F importer safety/integrity tests using tiny explicit fictional artifacts."""
from io import BytesIO
import json
import os
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch
from zipfile import ZipFile, ZipInfo

from . import import_f
from .handoff.files import EvidenceError, sha256


class ImportTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory(); self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        runtime = self.root / 'runtime'; runtime.mkdir()
        (runtime / 'experiment_f').mkdir()
        (runtime / 'environment_versions.json').write_text('{}')
        self.weights = self.root / 'downloaded-weights.safetensors'; self.weights.write_bytes(b'FICTIONAL tiny weights')
        adapter, config, base_config = b'FICTIONAL adapter', b'{"peft_type":"LORA"}', b'{"model_type":"fictional"}'
        files = {'adapter/adapter_model.safetensors': import_f.commitment(adapter), 'adapter/adapter_config.json': import_f.commitment(config)}
        raw = BytesIO()
        with ZipFile(raw, 'w') as z:
            z.writestr(import_f.PACKAGE + 'adapter/adapter_model.safetensors', adapter)
            z.writestr(import_f.PACKAGE + 'adapter/adapter_config.json', config)
            z.writestr(import_f.PACKAGE + 'package_manifest.json', '{}')
        import hashlib
        identity = {'packageSha256': hashlib.sha256(raw.getvalue()).hexdigest(), 'files': files, 'baseModel': 'fictional/base',
                    'baseRevision': 'a' * 40, 'artifactSha256': files['adapter/adapter_model.safetensors']['sha256'], 'scope': 'fictional_human_review_pilot'}
        self.identity = runtime / 'experiment_f/identity.json'; self.identity.write_text(json.dumps(identity))
        (runtime / 'model_manifest.json').write_text(json.dumps({'base_repository': 'fictional/base', 'base_revision': 'a' * 40,
            'files': {'base_model/config.json': import_f.commitment(base_config),
                      'base_model/model.safetensors-00001-of-00001.safetensors': import_f.commitment(self.weights.read_bytes())}}))
        base = BytesIO()
        with ZipFile(base, 'w') as z:
            z.writestr(import_f.BASE + 'config.json', base_config)
        self.bundle = self.root / 'bundle.zip'
        with ZipFile(self.bundle, 'w') as z:
            z.writestr('export/AGAP_F_Integration_Adapter_v1.zip', raw.getvalue())
            z.writestr('export/pretrained_base_qwen3_5_2b-1.zip', base.getvalue())
        self.destination = self.root / 'artifacts/f'
        for name, value in [('HERE', runtime), ('IDENTITY', self.identity)]:
            patcher = patch.object(import_f, name, value); patcher.start(); self.addCleanup(patcher.stop)

    def run_import(self):
        return import_f.import_artifacts([self.bundle], self.weights, self.destination)

    def test_atomic_complete_import_links_weights_and_preserves_download(self):
        before = sha256(self.weights)
        report = self.run_import()
        self.assertFalse(report['modelExecuted']); self.assertEqual(report['promotion'], 'not_promoted')
        self.assertTrue(report['baseWeightsHardlinked'])
        self.assertEqual(os.stat(self.weights).st_ino, os.stat(self.destination / 'base_model/model.safetensors-00001-of-00001.safetensors').st_ino)
        self.assertEqual(sha256(self.weights), before)
        self.assertEqual(import_f.verify(self.destination, report['manifestSha256'])['filesVerified'], 7)

    def test_existing_destination_is_never_overwritten(self):
        self.run_import()
        with self.assertRaises(EvidenceError):
            self.run_import()

    def test_tampered_base_refused_before_destination_created(self):
        self.weights.write_bytes(b'tampered')
        with self.assertRaises(EvidenceError):
            self.run_import()
        self.assertFalse(self.destination.exists())

    def test_package_commitment_refused_even_when_zip_is_valid(self):
        value = json.loads(self.identity.read_text()); value['packageSha256'] = '0' * 64; self.identity.write_text(json.dumps(value))
        with self.assertRaises(EvidenceError):
            self.run_import()
        self.assertFalse(self.destination.exists())

    def test_missing_base_parts_cannot_publish_partial_artifact(self):
        with ZipFile(self.bundle) as z:
            package = z.read('export/AGAP_F_Integration_Adapter_v1.zip')
        with ZipFile(self.bundle, 'w') as z:
            z.writestr('export/AGAP_F_Integration_Adapter_v1.zip', package)
        with self.assertRaises(EvidenceError):
            self.run_import()
        self.assertFalse(self.destination.exists())

    def test_source_symlinks_and_tampered_import_are_refused(self):
        linked = self.root / 'symlink'; linked.symlink_to(self.weights)
        with self.assertRaises(EvidenceError):
            import_f.import_artifacts([self.bundle], linked, self.destination)
        report = self.run_import()
        (self.destination / 'adapter/adapter_config.json').write_text('tamper')
        with self.assertRaises(EvidenceError):
            import_f.verify(self.destination, report['manifestSha256'])

    def test_archive_traversal_and_symbolic_links_are_rejected(self):
        for info in (ZipInfo('../escape'), ZipInfo('/absolute'), ZipInfo('windows\\escape'), ZipInfo('safe-link')):
            if info.filename == 'safe-link':
                info.external_attr = 0o120777 << 16
            raw = BytesIO()
            with ZipFile(raw, 'w') as z:
                z.writestr(info, 'bad')
            with ZipFile(BytesIO(raw.getvalue())) as z, self.assertRaises(EvidenceError):
                import_f.members(z)


if __name__ == '__main__':
    unittest.main()
