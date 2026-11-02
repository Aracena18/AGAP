"""Audit declared run evidence, without executing a model or granting release."""
import datetime
import re
from .checkpoint import inspect_adapter
from .dataset import SHA, verify_release
from .files import EvidenceError, check_export_text, file_under, finite, outside_git, read_json, require, sha256, serialize
import hashlib
from .schema import validate

REVISION = re.compile(r"^[a-f0-9]{40}$")
REQUIRED_FILES = {"adapter_config", "adapter_weights", "environment", "training_config", "trainer_state", "prompt", "output_schema",
                  "preprocessing", "baseline", "tuned", "reload_smoke", "training_code"}
SETTINGS = {"precision", "maxInputTokens", "maxNewTokens", "batchSize", "learningRate", "epochs"}


def draft(run_id):
    require(re.fullmatch(r"[a-z][a-z0-9_-]{0,99}", run_id), "Use a simple run ID")
    return {"schemaVersion": "agap-qwn-run/v1", "id": run_id, "task": "QWN-01", "status": "not_captured", "origin": "unknown",
            "base": {"id": "Qwen/Qwen3.5-2B", "revision": None, "processorRevision": None}, "codeRevision": None, "seed": None,
            "datasetManifestSha256": None, "promptVersion": None, "outputSchemaVersion": None, "startedAt": None, "finishedAt": None,
            "license": {"base": None, "adapter": None, "dataPermissionReference": None},
            "settings": dict.fromkeys(sorted(SETTINGS)), "measurements": {"gpu": None, "peakMemoryBytes": None, "trainingSeconds": None},
            "files": dict.fromkeys(sorted(REQUIRED_FILES))}


def _predictions(path, run, data, weight_hash, finding_schema):
    p = read_json(path)
    require(set(p) == {"schemaVersion", "inputCorpusSha256", "run", "cases"} and p["schemaVersion"] == "eval-01-predictions/v1",
            "Use Earl's canonical prediction envelope")
    require(p["inputCorpusSha256"] == data["corpusSha256"] and p["run"].get("origin") == "model", "Predictions are not model development outputs for this corpus")
    provenance = p["run"].get("artifact")
    require(isinstance(provenance, dict) and set(provenance) == {"baseModel", "baseRevision", "artifactSha256", "promptVersion", "schemaVersion", "datasetManifestSha256", "evaluationReference"}, "Canonical model provenance missing")
    require(provenance["baseModel"] == run["base"]["id"] and provenance["baseRevision"] == run["base"]["revision"]
            and provenance["artifactSha256"] == weight_hash and provenance["datasetManifestSha256"] == data["manifestSha256"]
            and provenance["promptVersion"] == run["promptVersion"] and provenance["schemaVersion"] == run["outputSchemaVersion"]
            and isinstance(provenance["evaluationReference"], str) and provenance["evaluationReference"].strip(), "Prediction artifact/data/prompt/schema provenance differs")
    require(isinstance(p["run"].get("environment"), str) and p["run"]["environment"].strip(), "Prediction environment missing")
    rows = p["cases"]
    require(isinstance(rows, list) and len(rows) == len(data["validationCaseIds"])
            and len({r.get("caseId") for r in rows}) == len(rows)
            and {r.get("caseId") for r in rows} == set(data["validationCaseIds"]), "Predictions omit/duplicate cases or include non-validation/holdout IDs")
    for row in rows:
        require(set(row) == {"caseId", "findings", "elapsedMs", "peakMemoryBytes"} and isinstance(row["findings"], list), "Invalid prediction row")
        require(row["elapsedMs"] is None or finite(row["elapsedMs"]), "Invalid latency measurement")
        require(row["peakMemoryBytes"] is None or finite(row["peakMemoryBytes"], integer=True), "Invalid memory measurement")
        for finding in row["findings"]:
            validate(finding, finding_schema)
    return {"sha256": sha256(path), "cases": len(rows), "measuredLatencyCases": sum(r["elapsedMs"] is not None for r in rows),
            "measuredMemoryCases": sum(r["peakMemoryBytes"] is not None for r in rows), "execution": "declared_not_attested"}


def audit(run_path, artifact_root, release_root=None, expected_release_sha=None):
    run = read_json(run_path)
    require(isinstance(run, dict) and set(run) == set(draft("shape")) and run["schemaVersion"] == "agap-qwn-run/v1" and run["task"] == "QWN-01", "Unsupported run record or task")
    require(re.fullmatch(r"[a-z][a-z0-9_-]{0,99}", str(run["id"])), "Invalid run ID")
    require(run["status"] in {"not_captured", "running", "interrupted", "completed", "failed"} and run["origin"] in {"unknown", "model", "simulated"}, "Invalid run state/origin")
    require(isinstance(run["files"], dict) and set(run["files"]) == REQUIRED_FILES, "Unexpected evidence roles")
    problems, evidence = [], {}
    def check(label, work):
        try:
            return work()
        except (EvidenceError, OSError, ValueError, TypeError, KeyError, AttributeError) as error:
            problems.append({"code": label, "detail": str(error)})
            return None
    def provenance():
        require(run["origin"] == "model" and run["status"] == "completed", "Actual completed model run evidence is required")
        b = run["base"]
        require(set(b) == {"id", "revision", "processorRevision"} and b["id"] in {"Qwen/Qwen3.5-2B", "unsloth/Qwen3.5-2B"}
                and REVISION.fullmatch(str(b["revision"])) and REVISION.fullmatch(str(b["processorRevision"]))
                and REVISION.fullmatch(str(run["codeRevision"])), "Pin exact agreed base/processor/code revisions; branch names are not pins")
        require(finite(run["seed"], integer=True) and run["promptVersion"] and run["outputSchemaVersion"], "Seed/prompt/schema version missing")
        license_record = run["license"]
        require(set(license_record) == {"base", "adapter", "dataPermissionReference"} and license_record["base"] == "Apache-2.0"
                and all(isinstance(license_record[k], str) and license_record[k].strip() for k in ("adapter", "dataPermissionReference")), "Declared base/adapter license and data-permission reference missing")
        require(isinstance(run["startedAt"], str) and isinstance(run["finishedAt"], str), "Actual start/finish instants missing")
        start = datetime.datetime.fromisoformat(run["startedAt"].replace("Z", "+00:00"))
        end = datetime.datetime.fromisoformat(run["finishedAt"].replace("Z", "+00:00"))
        require(start.tzinfo is not None and end.tzinfo is not None and end >= start, "Invalid run time interval")
        settings = run["settings"]
        require(set(settings) == SETTINGS and settings["precision"] in {"fp16", "bf16", "fp32"}, "Precision/settings missing; no inferred 4-bit training")
        require(all(finite(settings[k], integer=True, positive=True) for k in ("maxInputTokens", "maxNewTokens", "batchSize"))
                and finite(settings["learningRate"], positive=False) and 0 < settings["learningRate"] < 1 and finite(settings["epochs"], positive=True), "Invalid training/inference limits")
        m = run["measurements"]
        require(set(m) == {"gpu", "peakMemoryBytes", "trainingSeconds"} and isinstance(m["gpu"], str) and m["gpu"].strip()
                and finite(m["peakMemoryBytes"], integer=True, positive=True) and finite(m["trainingSeconds"], positive=True), "Actual GPU/peak-memory/runtime measurements missing")
        require(m["trainingSeconds"] <= (end - start).total_seconds(), "Training wall-clock runtime exceeds the declared run interval")
    check("run_provenance", provenance)
    for role in sorted(REQUIRED_FILES):
        def resolve_role(role=role):
            path = file_under(artifact_root, run["files"][role])
            if role != "adapter_weights":
                check_export_text(path)
            evidence[role] = {"path": run["files"][role], "sha256": sha256(path), "bytes": path.stat().st_size}
            return path
        check("file_" + role, resolve_role)
    data = check("reviewed_data_release", lambda: verify_release(release_root, expected_release_sha)) if release_root else None
    if not release_root:
        problems.append({"code": "reviewed_data_release", "detail": "Reviewed training/validation release and published expected hash are missing"})
    if data and run["datasetManifestSha256"] != data["manifestSha256"]:
        problems.append({"code": "run_data_commitment", "detail": "Run data commitment differs from supplied release"})
    adapter = None
    if {"adapter_config", "adapter_weights"} <= evidence.keys():
        check("weights_location", lambda: outside_git(file_under(artifact_root, run["files"]["adapter_weights"])))
        adapter = check("adapter", lambda: inspect_adapter(file_under(artifact_root, run["files"]["adapter_config"]), file_under(artifact_root, run["files"]["adapter_weights"]), run["base"]["id"], run["base"]["revision"]))
    if {"environment", "training_config", "trainer_state", "reload_smoke"} <= evidence.keys():
        def execution_records():
            environment = read_json(file_under(artifact_root, run["files"]["environment"]))
            require(environment.get("runId") == run["id"] and environment.get("python") and isinstance(environment.get("packages"), dict)
                    and all(isinstance(environment["packages"].get(k), str) and environment["packages"][k] for k in ("torch", "transformers", "peft", "safetensors")), "Pinned ML environment is incomplete")
            config = read_json(file_under(artifact_root, run["files"]["training_config"]))
            require(config.get("seed") == run["seed"] and config.get("precision") == run["settings"]["precision"]
                    and config.get("learning_rate") == run["settings"]["learningRate"] and config.get("num_train_epochs") == run["settings"]["epochs"]
                    and config.get("per_device_train_batch_size") == run["settings"]["batchSize"] and config.get("quantization_bits") is None, "Saved training settings differ or unsupported quantization was used")
            state = read_json(file_under(artifact_root, run["files"]["trainer_state"]))
            require(finite(state.get("global_step"), integer=True, positive=True) and isinstance(state.get("log_history"), list) and state["log_history"], "Actual trainer steps/log history missing")
            smoke = read_json(file_under(artifact_root, run["files"]["reload_smoke"]))
            require(adapter and smoke.get("schemaVersion") == "agap-qwn-reload/v1" and smoke.get("runId") == run["id"]
                    and smoke.get("adapterSha256") == adapter["weightsSha256"] and smoke.get("baseRevision") == run["base"]["revision"]
                    and smoke.get("processorRevision") == run["base"]["processorRevision"] and smoke.get("status") == "passed"
                    and finite(smoke.get("elapsedMs"), positive=True) and finite(smoke.get("peakMemoryBytes"), integer=True, positive=True), "Real reload-smoke evidence missing or inconsistent")
        check("execution_records", execution_records)
    predictions = {}
    if data and adapter and {"prompt", "output_schema", "preprocessing", "baseline", "tuned"} <= evidence.keys():
        def comparison():
            finding_schema = read_json(file_under(artifact_root, run["files"]["output_schema"]))
            require(sha256(file_under(release_root, "finding.schema.json")) == evidence["output_schema"]["sha256"], "Output schema differs from producer release")
            settings = read_json(file_under(artifact_root, run["files"]["preprocessing"]))
            require(settings.get("validationInputSha256") == data["validationInputSha256"] and settings.get("promptSha256") == evidence["prompt"]["sha256"]
                    and settings.get("schemaSha256") == evidence["output_schema"]["sha256"] and settings.get("maxInputTokens") == run["settings"]["maxInputTokens"]
                    and settings.get("maxNewTokens") == run["settings"]["maxNewTokens"], "Preprocessing/inference commitments differ")
            require(isinstance(settings.get("settings"), dict) and settings["settings"], "Document preprocessing settings missing")
            settings_hash = hashlib.sha256(serialize(settings["settings"]).encode()).hexdigest()
            for name, weight in (("baseline", None), ("tuned", adapter["weightsSha256"])):
                comparison = settings.get(name)
                require(isinstance(comparison, dict) and comparison.get("outputSha256") == evidence[name]["sha256"]
                        and comparison.get("promptSha256") == evidence["prompt"]["sha256"] and comparison.get("schemaSha256") == evidence["output_schema"]["sha256"]
                        and comparison.get("processorRevision") == run["base"]["processorRevision"] and comparison.get("settingsSha256") == settings_hash
                        and comparison.get("environmentSha256") == evidence["environment"]["sha256"] and comparison.get("precision") == run["settings"]["precision"]
                        and comparison.get("maxInputTokens") == run["settings"]["maxInputTokens"] and comparison.get("maxNewTokens") == run["settings"]["maxNewTokens"],
                        "Baseline/tuned outputs are not bound to identical environment, precision, preprocessing, prompt and limits")
                predictions[name] = _predictions(file_under(artifact_root, run["files"][name]), run, data, weight, finding_schema)
                record = read_json(file_under(artifact_root, run["files"][name]))["run"]
                require(record.get("id") != run["id"], "Baseline/tuned inference run IDs must be distinct from training")
            require(read_json(file_under(artifact_root, run["files"]["baseline"]))["run"]["id"] != read_json(file_under(artifact_root, run["files"]["tuned"]))["run"]["id"], "Baseline and tuned run IDs must differ")
        check("baseline_tuned_comparison", comparison)
    return {"schemaVersion": "agap-qwn-audit/v1", "runId": run["id"], "runRecordSha256": sha256(run_path),
            "declaredStatus": run["status"], "files": evidence, "data": data, "adapter": adapter, "developmentOutputs": predictions,
            "readyForIndependentEvaluation": not problems, "blockers": problems, "promotion": "not_promoted",
            "executionAttested": False, "reviewAuthenticated": False, "performanceClaim": None}
