"""Temporary fictional validator fixtures only. No trained weights or gold corpus.

The positive fixture DECLARES model provenance to exercise the parser; no model
executes. A ready candidate is explicitly not authenticated or promoted.
"""
import copy
import hashlib
import io
import json
from pathlib import Path
import struct
import tempfile
import unittest
from unittest.mock import patch
from contextlib import redirect_stdout, redirect_stderr

from models.qwen.handoff.audit import audit, draft
from models.qwen.handoff.bundle import build, verify
from models.qwen.handoff.checkpoint import inspect_adapter
from models.qwen.handoff.dataset import verify_release
from models.qwen.handoff.files import EvidenceError, file_under, inventory, loads, read_json, serialize, sha256, write_new
from models.qwen.handoff.schema import validate
from models.qwen.handoff.__main__ import main


def write(path, value):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(serialize(value), encoding="utf-8")


class Fixture:
    def __init__(self, root):
        self.root = root
        self.artifacts = root / "export"
        self.release = root / "reviewed-envelope-harness"
        self.artifacts.mkdir(); self.release.mkdir()
        self.corpus = {"schemaVersion": "eval-01-corpus/v1", "contractVersion": "0.2.0", "id": "fictional-harness", "version": "v1",
                       "purpose": "development", "provenance": {"method": "private_authored", "seed": None, "authoredOn": "2026-11-02"}, "cases": []}
        for number in (1, 2):
            text = f"FICTIONAL harness source {number}: income 100 centavos."
            source = {"id": f"00000000-0000-4000-8000-{number:012}", "version": 1, "page": 1, "documentDate": "2026-11-02", "templateFamily": f"fixture-{number}",
                      "augmentationOf": None, "text": text, "sha256": hashlib.sha256(text.encode()).hexdigest()}
            finding = {"field": "income", "value": {"availability": "recorded", "amountCentavos": 100}, "cashDate": "2026-11-15", "relevance": "supported", "recurrence": "unknown",
                       "action": "extract", "question": None, "sources": [{"sourceId": source["id"], "sourceVersion": 1, "excerpt": text, "page": 1}]}
            self.corpus["cases"].append({"id": f"fixture-{number}", "householdGroup": f"household-{number}", "scenarioGroup": f"scenario-{number}", "coverage": ["harness"],
                                         "requestedFields": ["income"], "sources": [source], "expected": [finding], "rationale": "Fictional parser fixture, not expert labels."})
        # A minimal producer-schema fixture, not a replacement canonical registry.
        self.schema = {"type": "object", "additionalProperties": False, "required": ["field", "value", "cashDate", "relevance", "recurrence", "action", "question", "sources"],
                       "properties": {key: True for key in self.corpus["cases"][0]["expected"][0]}}
        write(self.release / "finding.schema.json", self.schema)
        self.refresh_release()
        config = {"peft_type": "LORA", "base_model_name_or_path": "Qwen/Qwen3.5-2B", "revision": None, "r": 2, "lora_alpha": 4, "lora_dropout": 0.0,
                  "target_modules": ["q_proj"], "bias": "none", "use_dora": False}
        write(self.artifacts / "adapter_config.json", config)
        self.header = {"__metadata__": {"format": "pt"},
                       "base_model.model.layer.q_proj.lora_A.weight": {"dtype": "F32", "shape": [2, 2], "data_offsets": [0, 16]},
                       "base_model.model.layer.q_proj.lora_B.weight": {"dtype": "F32", "shape": [2, 2], "data_offsets": [16, 32]}}
        self.weights()
        self.run = draft("fictional-harness")
        self.run.update({"status": "completed", "origin": "model", "codeRevision": "3" * 40, "seed": 42,
                         "base": {"id": "Qwen/Qwen3.5-2B", "revision": "1" * 40, "processorRevision": "2" * 40},
                         "datasetManifestSha256": self.release_sha, "promptVersion": "fixture-prompt-v1", "outputSchemaVersion": "fixture-finding-v1",
                         "startedAt": "2026-11-02T00:00:00Z", "finishedAt": "2026-11-02T00:02:00Z",
                         "settings": {"precision": "bf16", "maxInputTokens": 128, "maxNewTokens": 64, "batchSize": 1, "learningRate": 0.0001, "epochs": 1},
                         "measurements": {"gpu": "Fictional test GPU; no ML execution", "peakMemoryBytes": 1024, "trainingSeconds": 1}})
        self.run["license"] = {"base": "Apache-2.0", "adapter": "FICTIONAL unit permission only", "dataPermissionReference": "fictional-harness-review"}
        for role in self.run["files"]:
            self.run["files"][role] = "adapter_model.safetensors" if role == "adapter_weights" else "adapter_config.json" if role == "adapter_config" else "prompt.txt" if role == "prompt" else "train.py" if role == "training_code" else role + ".json"
        self.path = self.artifacts / "run.json"
        (self.artifacts / "prompt.txt").write_text("FICTIONAL extraction; no financial authority.\n")
        (self.artifacts / "train.py").write_text("# FICTIONAL harness. Does not train a model.\n")
        write(self.artifacts / "environment.json", {"runId": self.run["id"], "python": "3.fixture", "packages": {k: "fictional-fixture" for k in ("torch", "transformers", "peft", "safetensors")}})
        write(self.artifacts / "training_config.json", {"seed": 42, "precision": "bf16", "learning_rate": 0.0001, "num_train_epochs": 1, "per_device_train_batch_size": 1, "quantization_bits": None})
        write(self.artifacts / "trainer_state.json", {"global_step": 1, "log_history": [{"step": 1, "loss": 1.0}]})
        write(self.artifacts / "reload_smoke.json", {"schemaVersion": "agap-qwn-reload/v1", "runId": self.run["id"], "adapterSha256": sha256(self.artifacts / "adapter_model.safetensors"),
              "baseRevision": "1" * 40, "processorRevision": "2" * 40, "status": "passed", "elapsedMs": 1, "peakMemoryBytes": 1024})
        write(self.artifacts / "output_schema.json", self.schema)
        for name, weight in (("baseline", None), ("tuned", sha256(self.artifacts / "adapter_model.safetensors"))):
            record = {"schemaVersion": "eval-01-predictions/v1", "inputCorpusSha256": sha256(self.release / "corpus.json"),
                      "run": {"id": name + "-fixture", "origin": "model", "environment": "FICTIONAL harness only; not measured model performance",
                              "artifact": {"baseModel": "Qwen/Qwen3.5-2B", "baseRevision": "1" * 40, "artifactSha256": weight,
                                           "promptVersion": self.run["promptVersion"], "schemaVersion": self.run["outputSchemaVersion"], "datasetManifestSha256": self.release_sha, "evaluationReference": "pending-independent-evaluation"}},
                      "cases": [{"caseId": "fixture-2", "findings": self.corpus["cases"][1]["expected"], "elapsedMs": None, "peakMemoryBytes": None}]}
            write(self.artifacts / (name + ".json"), record)
        self.refresh_preprocessing()
        self.save()

    def weights(self):
        text = json.dumps(self.header, separators=(",", ":")).encode()
        text += b" " * ((-len(text)) % 8)
        (self.artifacts / "adapter_model.safetensors").write_bytes(struct.pack("<Q", len(text)) + text + bytes(32))

    def refresh_release(self):
        write(self.release / "corpus.json", self.corpus)
        for name, case in zip(("training", "validation"), self.corpus["cases"]):
            value = {"caseId": case["id"], "instruction": "FICTIONAL extraction task", "requestedFields": case["requestedFields"],
                     "documents": [{k: s[k] for k in ("id", "version", "page", "documentDate", "text")} for s in case["sources"]]}
            (self.release / (name + ".inputs.jsonl")).write_text(json.dumps(value) + "\n")
            (self.release / (name + ".targets.jsonl")).write_text(json.dumps({"caseId": case["id"], "findings": case["expected"]}) + "\n")
        dev_sha = sha256(self.release / "corpus.json")
        manifest = {"schemaVersion": "eval-01-bundle/v1", "kind": "reviewed_training_release", "inputCorpusSha256": dev_sha, "splitSeed": "fictional-unit-seed",
                    "splits": {"trainingCases": 1, "validationCases": 1, "developmentCases": 2}, "holdout": {"corpusSha256": "a" * 64, "caseCount": 1, "sourceCount": 1},
                    "review": {"developmentSha256": dev_sha, "holdoutSha256": "a" * 64, "labelReviewers": ["Fictional unit reviewer"], "interfaceReviewers": ["Fictional unit reviewer"],
                               "reviewedOn": "2026-11-02", "protocolVersion": "fictional-harness-v1", "primaryMeasure": "fixture only", "regressionCriteria": ["fixture only"]},
                    "artifacts": [{"name": p.name, "sha256": sha256(p)} for p in sorted(self.release.iterdir()) if p.name != "manifest.json"]}
        write(self.release / "manifest.json", manifest)
        self.release_sha = sha256(self.release / "manifest.json")

    def refresh_preprocessing(self):
        settings = {"modality": "text", "normalization": "none"}
        common = {"validationInputSha256": sha256(self.release / "validation.inputs.jsonl"), "promptSha256": sha256(self.artifacts / "prompt.txt"),
                  "schemaSha256": sha256(self.artifacts / "output_schema.json"), "maxInputTokens": 128, "maxNewTokens": 64, "settings": settings}
        for name in ("baseline", "tuned"):
            common[name] = {"outputSha256": sha256(self.artifacts / (name + ".json")), "promptSha256": common["promptSha256"], "schemaSha256": common["schemaSha256"],
                            "processorRevision": "2" * 40, "settingsSha256": hashlib.sha256(serialize(settings).encode()).hexdigest(), "environmentSha256": sha256(self.artifacts / "environment.json"),
                            "precision": "bf16", "maxInputTokens": 128, "maxNewTokens": 64}
        write(self.artifacts / "preprocessing.json", common)

    def save(self):
        write(self.path, self.run)

    def audit(self):
        self.save()
        return audit(self.path, self.artifacts, self.release, self.release_sha)


class HandoffTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.f = Fixture(self.root)

    def assertBlocked(self, code):
        result = self.f.audit()
        self.assertFalse(result["readyForIndependentEvaluation"])
        self.assertIn(code, {x["code"] for x in result["blockers"]})
        self.assertEqual(result["promotion"], "not_promoted")

    def test_complete_fixture_audit_never_attests_or_promotes(self):
        report = self.f.audit()
        self.assertTrue(report["readyForIndependentEvaluation"], report["blockers"])
        self.assertFalse(report["executionAttested"])
        self.assertFalse(report["reviewAuthenticated"])
        self.assertIsNone(report["performanceClaim"])

    def test_unknown_measurements_remain_unknown_with_denominators(self):
        report = self.f.audit()
        self.assertEqual(report["developmentOutputs"]["baseline"]["measuredLatencyCases"], 0)
        self.assertEqual(read_json(self.f.artifacts / "baseline.json")["cases"][0]["elapsedMs"], None)

    def test_draft_does_not_invent_values(self):
        d = draft("existing-run")
        self.assertIsNone(d["base"]["revision"])
        self.assertIsNone(d["measurements"]["gpu"])
        self.assertEqual(d["status"], "not_captured")

    def test_draft_audit_reports_missing_instead_of_crashing(self):
        write(self.f.path, draft("missing-run"))
        result = audit(self.f.path, self.f.artifacts)
        self.assertFalse(result["readyForIndependentEvaluation"])
        self.assertGreater(len(result["blockers"]), 10)

    def test_running_interrupted_failed_and_simulated_are_not_completed(self):
        for status in ("running", "interrupted", "failed"):
            with self.subTest(status=status):
                self.f.run["status"] = status
                self.assertBlocked("run_provenance")
        self.f.run["status"] = "completed"; self.f.run["origin"] = "simulated"
        self.assertBlocked("run_provenance")

    def test_moving_model_revision_not_a_pin(self):
        self.f.run["base"]["revision"] = "main"
        self.assertBlocked("run_provenance")

    def test_unknown_gpu_or_runtime_cannot_be_zero(self):
        self.f.run["measurements"]["trainingSeconds"] = 0
        self.assertBlocked("run_provenance")

    def test_wallclock_runtime_must_fit_interval(self):
        self.f.run["measurements"]["trainingSeconds"] = 10000
        self.assertBlocked("run_provenance")

    def test_null_completed_dates_are_reported(self):
        self.f.run["startedAt"] = None
        self.assertBlocked("run_provenance")

    def test_missing_baseline_blocks(self):
        (self.f.artifacts / "baseline.json").unlink()
        self.assertBlocked("file_baseline")

    def test_missing_real_smoke_record_blocks(self):
        (self.f.artifacts / "reload_smoke.json").unlink()
        self.assertBlocked("file_reload_smoke")

    def test_empty_trainer_logs_block(self):
        write(self.f.artifacts / "trainer_state.json", {"global_step": 0, "log_history": []})
        self.assertBlocked("execution_records")

    def test_quantized_training_is_not_silently_accepted(self):
        p = self.f.artifacts / "training_config.json"; value = read_json(p); value["quantization_bits"] = 4; write(p, value)
        self.assertBlocked("execution_records")

    def test_environment_must_pin_required_ml_packages(self):
        p = self.f.artifacts / "environment.json"; value = read_json(p); value["packages"]["torch"] = None; write(p, value)
        self.assertBlocked("execution_records")

    def test_paths_cannot_escape_or_be_absolute(self):
        for path in ("../private.json", "/etc/passwd", "C:\\secret.json"):
            with self.subTest(path=path), self.assertRaises(EvidenceError):
                file_under(self.f.artifacts, path)

    def test_symlinks_are_not_evidence(self):
        path = self.f.artifacts / "linked.json"; path.symlink_to(self.f.artifacts / "adapter_config.json")
        self.f.run["files"]["adapter_config"] = path.name
        self.assertBlocked("file_adapter_config")

    def test_duplicate_json_and_nonfinite_numbers_rejected(self):
        for text in ('{"x":1,"x":2}', '{"x":NaN}', '{"x":Infinity}', '{"x":1e400}'):
            with self.subTest(text=text), self.assertRaises(EvidenceError):
                loads(text)

    def test_release_requires_independent_expected_commitment(self):
        with self.assertRaises(EvidenceError):
            verify_release(self.f.release, "0" * 64)

    def test_development_preview_is_not_a_reviewed_release(self):
        p = self.f.release / "manifest.json"; m = read_json(p); m["kind"] = "development_preview"; write(p, m)
        with self.assertRaises(EvidenceError):
            verify_release(self.f.release, sha256(p))

    def test_extra_holdout_file_is_not_read_or_exported(self):
        (self.f.release / "holdout.targets.jsonl").write_text("PRIVATE TEST SENTINEL")
        with self.assertRaises(EvidenceError):
            verify_release(self.f.release, self.f.release_sha)

    def test_manifest_artifact_tampering_rejected(self):
        (self.f.release / "training.targets.jsonl").write_text("{}\n")
        with self.assertRaises(EvidenceError):
            verify_release(self.f.release, self.f.release_sha)

    def test_group_overlap_rejected_even_with_new_hashes(self):
        self.f.corpus["cases"][1]["householdGroup"] = self.f.corpus["cases"][0]["householdGroup"]
        self.f.refresh_release()
        with self.assertRaises(EvidenceError):
            verify_release(self.f.release, self.f.release_sha)

    def test_adapter_base_and_revision_mismatch_rejected(self):
        p = self.f.artifacts / "adapter_config.json"; c = read_json(p); c["revision"] = "9" * 40; write(p, c)
        self.assertBlocked("adapter")

    def test_unsupported_adapter_variant_refused(self):
        p = self.f.artifacts / "adapter_config.json"; c = read_json(p); c["use_dora"] = True; write(p, c)
        self.assertBlocked("adapter")

    def test_pickle_is_never_loaded(self):
        (self.f.artifacts / "adapter_model.bin").write_bytes(b"never execute this")
        self.f.run["files"]["adapter_weights"] = "adapter_model.bin"
        self.assertBlocked("adapter")

    def test_truncated_tensor_header_rejected(self):
        (self.f.artifacts / "adapter_model.safetensors").write_bytes(b"bad")
        self.assertBlocked("adapter")

    def test_overlapping_tensor_ranges_rejected(self):
        self.f.header["base_model.model.layer.q_proj.lora_B.weight"]["data_offsets"] = [0, 16]; self.f.weights()
        self.assertBlocked("adapter")

    def test_wrong_lora_rank_rejected(self):
        p = self.f.artifacts / "adapter_config.json"; c = read_json(p); c["r"] = 3; write(p, c)
        self.assertBlocked("adapter")

    def test_unpaired_tensors_rejected(self):
        del self.f.header["base_model.model.layer.q_proj.lora_B.weight"]; self.f.weights()
        self.assertBlocked("adapter")

    def test_appended_weight_bytes_rejected(self):
        with (self.f.artifacts / "adapter_model.safetensors").open("ab") as stream:
            stream.write(b"unclaimed")
        self.assertBlocked("adapter")

    def test_simulated_predictions_not_model_evidence(self):
        p = self.f.artifacts / "baseline.json"; v = read_json(p); v["run"]["origin"] = "simulated"; write(p, v); self.f.refresh_preprocessing()
        self.assertBlocked("baseline_tuned_comparison")

    def test_heldout_or_extra_prediction_cases_rejected(self):
        p = self.f.artifacts / "tuned.json"; v = read_json(p); v["cases"][0]["caseId"] = "holdout-private"; write(p, v); self.f.refresh_preprocessing()
        self.assertBlocked("baseline_tuned_comparison")

    def test_changed_prompt_and_limits_rejected(self):
        p = self.f.artifacts / "preprocessing.json"; v = read_json(p); v["baseline"]["maxNewTokens"] = 999; write(p, v)
        self.assertBlocked("baseline_tuned_comparison")

    def test_wrong_tuned_weight_commitment_rejected(self):
        p = self.f.artifacts / "tuned.json"; v = read_json(p); v["run"]["artifact"]["artifactSha256"] = "c" * 64; write(p, v); self.f.refresh_preprocessing()
        self.assertBlocked("baseline_tuned_comparison")

    def test_source_schema_rejects_authoritative_extra_fields(self):
        p = self.f.artifacts / "tuned.json"; v = read_json(p); v["cases"][0]["findings"][0]["approval"] = True; write(p, v); self.f.refresh_preprocessing()
        self.assertBlocked("baseline_tuned_comparison")

    def test_unknown_schema_vocabulary_does_not_hide_in_union(self):
        with self.assertRaises(EvidenceError):
            validate({}, {"anyOf": [True, {"unsupportedAssertion": True}]})

    def test_semantically_wrong_but_shaped_outputs_are_not_claimed_correct(self):
        p = self.f.artifacts / "tuned.json"; v = read_json(p); v["cases"][0]["findings"][0]["value"]["amountCentavos"] = 999; write(p, v); self.f.refresh_preprocessing()
        result = self.f.audit()
        self.assertTrue(result["readyForIndependentEvaluation"])
        self.assertIsNone(result["performanceClaim"])
        self.assertEqual(result["promotion"], "not_promoted")

    def test_bundle_round_trip_has_no_corpus_or_holdout(self):
        self.f.save(); output = self.root / "candidate"
        result = build(self.f.path, self.f.artifacts, self.f.release, self.f.release_sha, output)
        self.assertEqual(result["integrity"], "passed")
        names = {p.name for p in output.rglob('*') if p.is_file()}
        self.assertNotIn("corpus.json", names); self.assertNotIn("training.targets.jsonl", names)
        self.assertEqual(result["promotion"], "not_promoted")
        with self.assertRaises(EvidenceError):
            build(self.f.path, self.f.artifacts, self.f.release, self.f.release_sha, output)

    def test_weight_and_output_locations_must_be_outside_git(self):
        (self.f.artifacts / ".git").write_text("fictional checkout marker")
        self.assertBlocked("weights_location")
        (self.f.artifacts / ".git").unlink()
        (self.root / ".git").write_text("fictional checkout marker")
        self.f.save()
        with self.assertRaises(EvidenceError):
            build(self.f.path, self.f.artifacts, self.f.release, self.f.release_sha, self.root / "candidate")

    def test_corrupt_or_extra_packaged_evidence_rejected(self):
        self.f.save(); output = self.root / "candidate"
        build(self.f.path, self.f.artifacts, self.f.release, self.f.release_sha, output); commitment = sha256(output / "manifest.json")
        (output / "extra.txt").write_text("unexpected")
        with self.assertRaises(EvidenceError):
            verify(output, commitment)
        (output / "extra.txt").unlink()
        with (output / "adapter/adapter_model.safetensors").open("ab") as stream:
            stream.write(b"changed")
        with self.assertRaises(EvidenceError):
            verify(output, commitment)

    def test_promotion_flag_cannot_be_forged_into_candidate_verification(self):
        self.f.save(); output = self.root / "candidate"
        build(self.f.path, self.f.artifacts, self.f.release, self.f.release_sha, output)
        path = output / "manifest.json"; m = read_json(path); m["promotion"] = "promoted"; write(path, m)
        with self.assertRaises(EvidenceError):
            verify(output, sha256(path))

    def test_inventory_ignores_arbitrary_private_files(self):
        (self.f.artifacts / "credentials.txt").write_text("PRIVATE SENTINEL")
        result = inventory(self.f.artifacts)
        self.assertNotIn("credentials.txt", {f["path"] for f in result["files"]})
        self.assertFalse(result["modelExecutionAttested"])

    def test_no_holdout_file_is_opened(self):
        private = self.root / "private-holdout.json"; private.write_text("PRIVATE")
        original = Path.open
        def guarded(path, *args, **kwargs):
            self.assertNotEqual(path, private)
            return original(path, *args, **kwargs)
        with patch.object(Path, "open", guarded):
            self.assertTrue(self.f.audit()["readyForIndependentEvaluation"])

    def test_cli_refuses_overwrite_and_returns_expected_audit_block(self):
        path = self.root / "draft.json"
        with redirect_stdout(io.StringIO()), redirect_stderr(io.StringIO()):
            self.assertEqual(main(["init", "--run-id", "unknown-run", "--out", str(path)]), 0)
            self.assertEqual(main(["init", "--run-id", "unknown-run", "--out", str(path)]), 1)
            self.assertEqual(main(["audit", "--run", str(path), "--artifacts", str(self.f.artifacts), "--out", str(self.root / "report.json")]), 2)
        self.assertFalse(read_json(self.root / "report.json")["readyForIndependentEvaluation"])

    def test_environment_capture_does_not_import_or_execute_ml(self):
        import importlib.metadata
        with patch.object(importlib.metadata, "version", side_effect=importlib.metadata.PackageNotFoundError), redirect_stdout(io.StringIO()):
            self.assertEqual(main(["environment", "--run-id", "unknown-run", "--out", str(self.root / "environment.json")]), 0)
        result = read_json(self.root / "environment.json")
        self.assertIsNone(result["packages"]["torch"])
        self.assertIn("not_training_attestation", result["captureScope"])

    def test_licenses_are_not_inferred_for_adapter_or_training_data(self):
        self.f.run["license"]["adapter"] = None
        self.assertBlocked("run_provenance")

    def test_credential_fields_are_not_copied_as_environment_metadata(self):
        p = self.f.artifacts / "environment.json"; value = read_json(p); value["hf_token"] = "private-value"; write(p, value)
        self.assertBlocked("file_environment")

    def test_recognizable_tokens_are_rejected_in_training_code(self):
        (self.f.artifacts / "train.py").write_text("# fake scanner sentinel hf_" + "x" * 30)
        self.assertBlocked("file_training_code")

    def test_extra_metadata_cannot_be_added_even_with_a_new_manifest_pin(self):
        self.f.save(); output = self.root / "candidate"
        build(self.f.path, self.f.artifacts, self.f.release, self.f.release_sha, output)
        extra = output / "holdout.json"; write(extra, {"private": "fictional sentinel"})
        path = output / "manifest.json"; m = read_json(path); m["files"][extra.name] = {"sha256": sha256(extra), "bytes": extra.stat().st_size, "role": "metadata"}; write(path, m)
        with self.assertRaises(EvidenceError):
            verify(output, sha256(path))


if __name__ == "__main__":
    unittest.main()
