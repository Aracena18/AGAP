"""Fictional research-envelope tests; no model execution or performance claim."""
import tempfile
import unittest
from pathlib import Path
from test_handoff import Fixture, write
from models.qwen.handoff.checkpoint import inspect_adapter
from models.qwen.handoff.files import EvidenceError, read_json, sha256
from models.qwen.handoff.research import SELECTED, inspect_export, package_export, verify_export, notebook_summary


class ResearchTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.fixture = Fixture(Path(self.temp.name))
        self.root = self.fixture.artifacts
        self.output = Path(self.temp.name) / "candidate"
        for name in SELECTED:
            p = self.root / name
            p.parent.mkdir(parents=True, exist_ok=True)
            if name == "adapter/adapter_config.json":
                p.parent.mkdir(parents=True, exist_ok=True)
                p.write_bytes((self.root / "adapter_config.json").read_bytes())
            elif name == "adapter/adapter_model.safetensors":
                p.write_bytes((self.root / "adapter_model.safetensors").read_bytes())
            elif p.suffix in {".json"}:
                write(p, {})
            else:
                p.parent.mkdir(parents=True, exist_ok=True)
                p.write_text("FICTIONAL research parser harness\n")
        self.c = {"base_revision_observed": "1" * 40, "payslips_validation_sha256": "2" * 64,
                  "tatqa_validation_sha256": "3" * 64}
        write(self.root / "evaluation/experiment_C/evaluation_config.json", self.c)
        write(self.root / "evaluation/experiment_D/evaluation_config_matched_to_C.json", {
            "original_C_config": self.c, "based_on_C_evaluation_config_sha256": sha256(self.root / "evaluation/experiment_C/evaluation_config.json"),
            "D_adapter_sha256": sha256(self.root / "adapter/adapter_model.safetensors"), "base_model_revision_pinned": "1" * 40})
        self.refresh()

    def refresh(self):
        m = {"selected_model": "Experiment D", "package_type": "local_base_plus_lora_unmerged",
             "base_repository": "Qwen/Qwen3.5-2B", "base_revision": "1" * 40,
             "adapter_sha256": sha256(self.root / "adapter/adapter_model.safetensors"), "development_validation_only": True,
             "independent_financial_validation_completed": False, "automated_lending_decisions_allowed": False,
             "files": {name: {"sha256": sha256(self.root / name), "bytes": (self.root / name).stat().st_size} for name in SELECTED}}
        write(self.root / "model_manifest.json", m)
        self.sha = sha256(self.root / "model_manifest.json")

    def test_roundtrip_never_grants_independent_readiness(self):
        a = inspect_export(self.root, self.sha)
        self.assertFalse(a["independentEvaluationReady"])
        self.assertIsNone(a["base"]["processorRevision"])
        self.assertFalse(a["validationInputs"]["payslips"]["available"])
        v = package_export(self.root, self.sha, self.output)
        self.assertEqual(v["promotion"], "not_promoted")
        self.assertFalse((self.output / "datasets").exists())
        self.assertEqual([p.name for p in (self.output / "base_model").iterdir()], ["LICENSE"])
        self.assertEqual(verify_export(self.output, v["manifestSha256"]), v)

    def test_manifest_and_file_tampering_rejected(self):
        with self.assertRaises(EvidenceError): inspect_export(self.root, "0" * 64)
        (self.root / "environment_versions.json").write_text('{} ')
        with self.assertRaises(EvidenceError): inspect_export(self.root, self.sha)

    def test_changed_comparison_even_with_new_manifest_rejected(self):
        p = self.root / "evaluation/experiment_D/evaluation_config_matched_to_C.json"
        d = read_json(p); d["original_C_config"]["base_revision_observed"] = "9" * 40; write(p, d)
        self.refresh()
        with self.assertRaises(EvidenceError): inspect_export(self.root, self.sha)

    def test_wrong_validation_file_rejected(self):
        p = self.root / "datasets/(public) payslips-dataset/payslips/validation_sft.jsonl"
        p.parent.mkdir(parents=True); p.write_text("FICTIONAL changed validation\n")
        with self.assertRaises(EvidenceError): inspect_export(self.root, self.sha)

    def test_symlink_rejected(self):
        p = self.root / "environment_versions.json"; p.unlink()
        p.symlink_to(self.root / "README_LOCAL.md")
        with self.assertRaises(EvidenceError): inspect_export(self.root, self.sha)

    def test_no_overwrite_or_extra_files(self):
        v = package_export(self.root, self.sha, self.output)
        with self.assertRaises(EvidenceError): package_export(self.root, self.sha, self.output)
        (self.output / "holdout.json").write_text('{}')
        with self.assertRaises(EvidenceError): verify_export(self.output, v["manifestSha256"])

    def test_candidate_hash_binds_weights(self):
        v = package_export(self.root, self.sha, self.output)
        p = self.output / "adapter/adapter_model.safetensors"
        p.write_bytes(p.read_bytes() + b'changed')
        with self.assertRaises(EvidenceError): verify_export(self.output, v["manifestSha256"])

    def test_credential_rejected_before_package_created(self):
        write(self.root / "environment_versions.json", {"api_key": "fictional-secret-for-test"})
        self.refresh()
        with self.assertRaises(EvidenceError): package_export(self.root, self.sha, self.output)
        self.assertFalse(self.output.exists())

    def test_saved_outputs_are_filtered_and_errors_preserved(self):
        p = self.root / "notebook.ipynb"
        write(p, {"cells": [{"cell_type": "code", "execution_count": 1, "source": ["NEVER EXECUTE"], "outputs": [
            {"output_type": "stream", "text": "secret unknown output\nOptimizer steps: 362\nGPU reload verified: True\n"},
            {"output_type": "error", "ename": "AssertionError", "evalue": "private arbitrary text"}]}]})
        a = notebook_summary(p)
        self.assertEqual(a["recordedSignals"][0]["value"], 362)
        self.assertTrue(a["recordedSignals"][1]["value"])
        self.assertEqual(a["errors"], [{"cell": 0, "type": "AssertionError"}])
        self.assertNotIn("private", str(a)); self.assertNotIn("secret", str(a))

    def test_unreviewed_regex_rejected_without_evaluating_it(self):
        p = self.root / "adapter/adapter_config.json"; c = read_json(p)
        c["target_modules"] = "(a+)+$"; write(p, c)
        with self.assertRaises(EvidenceError): inspect_adapter(p, self.root / "adapter/adapter_model.safetensors", "Qwen/Qwen3.5-2B", "1" * 40)

    def test_inspected_unsloth_expression_matches_language_lora(self):
        expression = r"(?:.*?(?:language|text).*?(?:self_attn|attention|attn|mixer|mlp|feed_forward|ffn|dense|mixer).*?\.(?:qkv|proj|linear_fc1|linear_fc2|out_proj|in_proj_qkv|in_proj_z|in_proj_b|in_proj_a|gate_proj|up_proj|down_proj|q_proj|k_proj|v_proj|o_proj))|(?:\bmodel\.layers\.[\d]{1,}(?!.*\.experts\.\d)\..*?(?:self_attn|attention|attn|mixer|mlp|feed_forward|ffn|dense|mixer).*?\.(?:(?:qkv|proj|linear_fc1|linear_fc2|out_proj|in_proj_qkv|in_proj_z|in_proj_b|in_proj_a|gate_proj|up_proj|down_proj|q_proj|k_proj|v_proj|o_proj)))"
        p = self.root / "adapter_config.json"; c = read_json(p)
        c["target_modules"] = expression; c["base_model_name_or_path"] = "unsloth/Qwen3.5-2B"; write(p, c)
        self.fixture.header = {k.replace('base_model.model.layer.q_proj', 'base_model.model.model.language_model.layers.0.self_attn.q_proj'): v
                               for k, v in self.fixture.header.items()}
        self.fixture.weights()
        a = inspect_adapter(p, self.root / "adapter_model.safetensors", "unsloth/Qwen3.5-2B", "1" * 40)
        self.assertEqual(a["tensorCount"], 2)


if __name__ == '__main__':
    unittest.main()
