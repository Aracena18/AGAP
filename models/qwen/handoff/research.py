"""Supplied research export integrity and handoff, separate from AGAP release gates.

No model/notebook execution. A self-supplied manifest establishes byte consistency,
not remote origin, successful training, independent approval or runtime eligibility.
"""
import re
import shutil
from pathlib import Path
from .checkpoint import inspect_adapter
from .files import check_export_text, file_under, finite, outside_git, read_json, require, sha256, write_new

REV = re.compile(r"^[a-f0-9]{40}$")
SHA = re.compile(r"^[a-f0-9]{64}$")
SELECTED = {
    "adapter/adapter_config.json", "adapter/adapter_model.safetensors",
    "adapter/README.md", "base_model/LICENSE",
    "adapter/processor_config.json", "adapter/tokenizer_config.json", "adapter/chat_template.jinja",
    "environment_versions.json", "README_LOCAL.md",
    "evaluation/experiment_C/evaluation_config.json",
    "evaluation/experiment_C/payslips_metrics.json", "evaluation/experiment_C/tatqa_metrics.json",
    "evaluation/experiment_D/evaluation_config_matched_to_C.json",
    "evaluation/experiment_D/payslips_metrics.json", "evaluation/experiment_D/tatqa_metrics.json",
    "evaluation/experiment_D/payslips_per_example.csv", "evaluation/experiment_D/tatqa_per_example.csv",
    "evaluation/experiment_D/C_vs_D_selection_report.json",
    "evaluation/experiment_D/tatqa_schema_contract_audit_v2.json",
}
BOUNDARIES = [
    "Research continuation C to D is not a pretrained-versus-tuned baseline comparison.",
    "Raw C/D prediction files and original trainer/run manifests are absent from this export.",
    "D's 722-row continuation mixture and source C adapter bytes are not supplied for reproduction.",
    "AGAP reviewed-release/holdout acceptance and financial-semantic evaluation are not established.",
    "Recorded Colab execution is not independently rerun or attested by this offline tool.",
    "Standalone API source/reports are absent; application integration and QWN-02/QWN-03 are not released.",
]


def notebook_summary(path):
    n = read_json(path)
    require(isinstance(n.get("cells"), list), "Invalid notebook cells")
    result = {"sha256": sha256(path), "codeCells": 0, "executedCells": 0, "errors": [], "recordedSignals": []}
    patterns = {
        "optimizerSteps": r"^Optimizer steps:\s*(\d+)\s*$",
        "trainingLoss": r"^Aggregate training loss:\s*([0-9.eE+-]+)\s*$",
        "peakAllocatedGpuGiB": r"^Peak GPU GB:\s*([0-9.]+)\s*$",
        "httpStatus": r"^HTTP status:\s*(\d+)\s*$",
        "gpuReloadVerified": r"^GPU reload verified:\s*(True|False)\s*$",
        "modelLoaded": r"^Model loaded:\s*(True|False)\s*$",
    }
    for index, cell in enumerate(n["cells"]):
        if cell.get("cell_type") != "code":
            continue
        result["codeCells"] += 1
        result["executedCells"] += cell.get("execution_count") is not None
        for output in cell.get("outputs", []):
            if output.get("output_type") == "error":
                # Never export arbitrary traceback/error text or notebook source.
                name = output.get("ename", "")
                result["errors"].append({"cell": index, "type": name if re.fullmatch(r"[A-Za-z_]{1,80}", name) else "unrecognized"})
            if output.get("output_type") != "stream":
                continue
            text = output.get("text", [])
            text = text if isinstance(text, str) else "".join(text)
            for line in text.splitlines():
                for key, pattern in patterns.items():
                    match = re.fullmatch(pattern, line.strip())
                    if match:
                        raw = match[1]
                        value = raw == "True" if raw in {"True", "False"} else float(raw)
                        require(isinstance(value, bool) or finite(value), "Invalid recorded measurement")
                        result["recordedSignals"].append({"cell": index, "name": key, "value": value,
                                                          "provenance": "saved_notebook_output_not_attested"})
    return result


def inspect_export(root, expected_manifest_sha):
    manifest_path = file_under(root, "model_manifest.json")
    require(isinstance(expected_manifest_sha, str) and SHA.fullmatch(expected_manifest_sha)
            and sha256(manifest_path) == expected_manifest_sha, "Export manifest commitment differs")
    m = read_json(manifest_path)
    require(m.get("selected_model") == "Experiment D" and m.get("package_type") == "local_base_plus_lora_unmerged"
            and m.get("base_repository") in {"unsloth/Qwen3.5-2B", "Qwen/Qwen3.5-2B"}
            and REV.fullmatch(str(m.get("base_revision"))) and SHA.fullmatch(str(m.get("adapter_sha256"))), "Pinned model provenance missing")
    require(isinstance(m.get("files"), dict) and SELECTED <= m["files"].keys(), "Required research export files missing")
    require(m.get("development_validation_only") is True and m.get("independent_financial_validation_completed") is False
            and m.get("automated_lending_decisions_allowed") is False, "Unsupported research disposition")
    verified = {}
    for name, item in sorted(m["files"].items()):
        require(isinstance(item, dict) and SHA.fullmatch(str(item.get("sha256")))
                and finite(item.get("bytes"), integer=True), "Invalid export inventory entry")
        p = file_under(root, name)
        require(p.stat().st_size == item["bytes"] and sha256(p) == item["sha256"], "Export file hash/size differs: " + name)
        verified[name] = {"sha256": item["sha256"], "bytes": item["bytes"]}
    adapter = inspect_adapter(file_under(root, "adapter/adapter_config.json"), file_under(root, "adapter/adapter_model.safetensors"),
                              m["base_repository"], m["base_revision"])
    require(adapter["weightsSha256"] == m["adapter_sha256"], "Selected adapter hash differs")
    c = read_json(file_under(root, "evaluation/experiment_C/evaluation_config.json"))
    d = read_json(file_under(root, "evaluation/experiment_D/evaluation_config_matched_to_C.json"))
    require(d.get("original_C_config") == c and d.get("based_on_C_evaluation_config_sha256") == verified["evaluation/experiment_C/evaluation_config.json"]["sha256"]
            and d.get("D_adapter_sha256") == adapter["weightsSha256"] and d.get("base_model_revision_pinned") == m["base_revision"]
            and c.get("base_revision_observed") == m["base_revision"], "C/D comparison binding differs")
    validation = {}
    for task, folder in (("payslips", "(public) payslips-dataset/payslips"), ("tatqa", "(public) tatqa-dataset/tatqa")):
        relative = "datasets/" + folder + "/validation_sft.jsonl"
        if not (Path(root) / relative).exists() and not (Path(root) / relative).is_symlink():
            validation[task] = {"available": False, "expectedSha256": c.get(task + "_validation_sha256")}
            continue
        p = file_under(root, relative)
        actual = sha256(p)
        require(actual == c.get(task + "_validation_sha256"), "Validation dataset differs from evaluated input")
        validation[task] = {"available": True, "sha256": actual}
    notebooks = {}
    for name in ("AGAP_Experiment_B_Qwen3_5_2B_PAYSLIPS_LoRA.ipynb", "AGAP_Experiment_C_Qwen3_5_2B_Balanced_PAYSLIPS_TATQA_LoRA.ipynb",
                 "AGAP_Experiment_D_Step18_Continue_From_Experiment_C_LoRA.ipynb", "AGAP_ExperimentD_Final_Export_and_API.ipynb"):
        path = Path(root) / "notebooks" / name
        if path.exists():
            notebooks[name] = notebook_summary(file_under(root, "notebooks/" + name))
    return {"schemaVersion": "agap-qwn-research-audit/v1", "exportManifestSha256": expected_manifest_sha,
            "base": {"repository": m["base_repository"], "revision": m["base_revision"], "processorRevision": None},
            "adapter": adapter, "filesVerified": verified, "validationInputs": validation, "notebooks": notebooks,
            "artifactIntegrity": "passed", "scope": "public_research_development_candidate", "lineage": "D_continues_C_not_clean_base",
            "independentEvaluationReady": False, "executionAttested": False, "promotion": "not_promoted", "remainingEvidence": BOUNDARIES}


def package_export(root, expected_manifest_sha, output):
    report = inspect_export(root, expected_manifest_sha)
    output = outside_git(output)
    require(not output.exists(), "Refusing to overwrite candidate or partial export")
    # Preflight text before any copying. No raw notebook, datasets or base weights.
    for name in SELECTED - {"adapter/adapter_model.safetensors"}:
        check_export_text(file_under(root, name))
    output.mkdir(parents=True)
    files = {}
    for name in sorted(SELECTED | {"model_manifest.json"}):
        source = file_under(root, name)
        dest = output / name
        dest.parent.mkdir(parents=True, exist_ok=True)
        with source.open("rb") as src, dest.open("xb") as dst:
            shutil.copyfileobj(src, dst, 1024 * 1024)
        expected = expected_manifest_sha if name == "model_manifest.json" else report["filesVerified"][name]["sha256"]
        require(sha256(dest) == expected, "Source changed during copy; no completed manifest written")
        files[name] = {"sha256": expected, "bytes": dest.stat().st_size}
    write_new(output / "research-audit.json", report)
    card = output / "MODEL_CARD.md"
    card.write_text("# Experiment D research handoff\n\n"
        "Disposition: NOT PROMOTED. Independent AGAP acceptance is pending.\n\n"
        "This adapter continues Experiment C; C is not a clean pretrained baseline.\n"
        "Use the pinned base repository/revision and recorded environment in research-audit.json.\n"
        "Base weights are referenced by the original export inventory, not duplicated here.\n"
        "Notebook summaries are saved-output evidence, not independently attested execution.\n"
        "No raw dataset, holdout, notebook source, API implementation or provider is included.\n"
        "Financial values remain candidate text. No authenticity, arithmetic, 5C, goal guidance or lending authority is granted.\n\n"
        "See research-audit.json remainingEvidence before reproduction or evaluation.\n", encoding="utf-8")
    for name in ("research-audit.json", "MODEL_CARD.md"):
        files[name] = {"sha256": sha256(output / name), "bytes": (output / name).stat().st_size}
    write_new(output / "candidate-manifest.json", {"schemaVersion": "agap-qwn-research-candidate/v1", "files": files,
              "exportManifestSha256": expected_manifest_sha, "weightsSha256": report["adapter"]["weightsSha256"],
              "promotion": "not_promoted", "independentEvaluationReady": False, "executionAttested": False})
    return verify_export(output, sha256(output / "candidate-manifest.json"))


def verify_export(root, expected_manifest_sha):
    root = Path(root)
    path = file_under(root, "candidate-manifest.json")
    require(SHA.fullmatch(str(expected_manifest_sha)) and sha256(path) == expected_manifest_sha, "Research candidate manifest differs")
    m = read_json(path)
    require(m.get("schemaVersion") == "agap-qwn-research-candidate/v1" and m.get("promotion") == "not_promoted"
            and m.get("independentEvaluationReady") is False and m.get("executionAttested") is False, "Research candidate cannot grant runtime eligibility")
    required = SELECTED | {"model_manifest.json", "research-audit.json", "MODEL_CARD.md"}
    require(set(m.get("files", {})) == required, "Unexpected research package inventory")
    actual = {p.relative_to(root).as_posix() for p in root.rglob('*') if p.is_file() or p.is_symlink()}
    require(actual == required | {"candidate-manifest.json"}, "Missing/extra research package files")
    for name, item in m["files"].items():
        p = file_under(root, name)
        require(p.stat().st_size == item.get("bytes") and sha256(p) == item.get("sha256"), "Research package hash/size differs")
    a = read_json(file_under(root, "research-audit.json"))
    original = read_json(file_under(root, "model_manifest.json"))
    require(a.get("schemaVersion") == "agap-qwn-research-audit/v1" and a.get("promotion") == "not_promoted"
            and a.get("independentEvaluationReady") is False and a.get("executionAttested") is False
            and a.get("remainingEvidence") == BOUNDARIES and a.get("artifactIntegrity") == "passed", "Research audit disposition differs")
    require(a.get("exportManifestSha256") == m.get("exportManifestSha256") == sha256(file_under(root, "model_manifest.json"))
            and a.get("adapter", {}).get("weightsSha256") == m.get("weightsSha256") == original.get("adapter_sha256")
            == m["files"]["adapter/adapter_model.safetensors"]["sha256"], "Research evidence binding differs")
    for name in SELECTED:
        require(a.get("filesVerified", {}).get(name) == m["files"][name] == original.get("files", {}).get(name), "Research inventory binding differs")
    return {"schemaVersion": "agap-qwn-research-verification/v1", "manifestSha256": expected_manifest_sha,
            "filesVerified": len(required), "integrity": "passed", "promotion": "not_promoted", "independentEvaluationReady": False}
