"""Consumer integrity checks for Earl's existing EVAL-01 envelope.

No corpus generator, splitter, expert-label approval or holdout scorer lives here.
"""
import hashlib
import re
from pathlib import Path
from .files import file_under, loads, read_json, require, sha256

SHA = re.compile(r"^[a-f0-9]{64}$")
RELEASE_FILES = {"corpus.json", "finding.schema.json", "training.inputs.jsonl", "training.targets.jsonl",
                 "validation.inputs.jsonl", "validation.targets.jsonl"}


def jsonl(path):
    rows = []
    with Path(path).open(encoding="utf-8") as stream:
        for line in stream:
            require(len(line) <= 2 * 1024 * 1024, "Dataset row exceeds limit")
            require(line.strip(), "Blank dataset line")
            row = loads(line)
            require(isinstance(row, dict) and isinstance(row.get("caseId"), str), "Invalid dataset row")
            rows.append(row)
            require(len(rows) <= 10000, "Dataset row count exceeds limit")
    require(rows and len({r["caseId"] for r in rows}) == len(rows), "Missing or duplicate dataset case IDs")
    return rows


def verify_release(root, expected_sha):
    require(isinstance(expected_sha, str) and SHA.fullmatch(expected_sha), "Expected published release SHA-256 is required")
    manifest_file = file_under(root, "manifest.json")
    require(sha256(manifest_file) == expected_sha, "Published data manifest commitment differs")
    m = read_json(manifest_file)
    require(m.get("schemaVersion") == "eval-01-bundle/v1" and m.get("kind") == "reviewed_training_release",
            "Unreviewed preparation/development previews are not training releases")
    artifacts = m.get("artifacts")
    require(isinstance(artifacts, list) and {a.get("name") for a in artifacts} == RELEASE_FILES
            and len(artifacts) == len(RELEASE_FILES), "Unexpected release inventory; holdout files must not be supplied")
    require({p.name for p in Path(root).iterdir()} == RELEASE_FILES | {"manifest.json"}, "Release contains extra or missing files")
    for item in artifacts:
        require(SHA.fullmatch(str(item.get("sha256"))), "Invalid data artifact hash")
        require(sha256(file_under(root, item["name"])) == item["sha256"], "Data artifact checksum mismatch")
    review, holdout = m.get("review"), m.get("holdout")
    require(isinstance(review, dict) and isinstance(holdout, dict) and m.get("splitSeed"), "Review/split commitments missing")
    require(review.get("developmentSha256") == m.get("inputCorpusSha256") and review.get("holdoutSha256") == holdout.get("corpusSha256")
            and SHA.fullmatch(str(holdout.get("corpusSha256"))), "Review/corpus/holdout commitments differ")
    require(review.get("labelReviewers") and review.get("interfaceReviewers") and review.get("reviewedOn")
            and review.get("protocolVersion") and review.get("primaryMeasure") and review.get("regressionCriteria"), "Review evidence incomplete")
    corpus_path = file_under(root, "corpus.json")
    # Earl's bundle hashes its canonical serialized corpus bytes.
    require(sha256(corpus_path) == m.get("inputCorpusSha256"), "Development corpus hash differs")
    corpus = read_json(corpus_path)
    require(corpus.get("schemaVersion") == "eval-01-corpus/v1" and corpus.get("purpose") == "development", "Do not supply reserved holdout data to training")
    cases = corpus.get("cases")
    require(isinstance(cases, list) and cases, "Development cases missing")
    by_id = {c.get("id"): c for c in cases}
    require(len(by_id) == len(cases), "Duplicate development corpus IDs")
    partitions, groups, contents = {}, {}, {}
    for name in ("training", "validation"):
        inputs = jsonl(file_under(root, name + ".inputs.jsonl"))
        targets = jsonl(file_under(root, name + ".targets.jsonl"))
        ids = {r["caseId"] for r in inputs}
        require(ids == {r["caseId"] for r in targets} and ids <= by_id.keys(), "Input/target/corpus IDs differ")
        require(len(ids) == m.get("splits", {}).get(name + "Cases"), "Release split counts differ")
        partitions[name], groups[name], contents[name] = ids, set(), set()
        for row in inputs:
            require(set(row) == {"caseId", "instruction", "requestedFields", "documents"}, "Inference inputs must contain no targets or extra fields")
            c = by_id[row["caseId"]]
            groups[name].update(("household:" + c["householdGroup"], "scenario:" + c["scenarioGroup"]))
            require(row["requestedFields"] == c["requestedFields"], "Requested fields differ from corpus")
            expected_documents = [{"id": s["id"], "version": s["version"], "page": s["page"], "documentDate": s["documentDate"], "text": s["text"]} for s in c["sources"]]
            require(row["documents"] == expected_documents and isinstance(row["instruction"], str) and row["instruction"].strip(), "Inference source bindings differ")
            for s in c["sources"]:
                require(hashlib.sha256(s["text"].encode()).hexdigest() == s["sha256"] and "FICTIONAL" in s["text"], "Invalid fictional source/hash")
                normalized = re.sub(r"^Household .*$", "", s["text"], flags=re.M)
                contents[name].add(" ".join(normalized.split()))
        for row in targets:
            require(set(row) == {"caseId", "findings"} and row["findings"] == by_id[row["caseId"]]["expected"], "Training targets differ from reviewed corpus")
    require(not partitions["training"] & partitions["validation"] and not groups["training"] & groups["validation"]
            and not contents["training"] & contents["validation"], "Training/validation leakage")
    require(partitions["training"] | partitions["validation"] == by_id.keys(), "Incomplete development partitions")
    require(m.get("splits", {}).get("developmentCases") == len(cases), "Development count differs")
    return {"manifestSha256": expected_sha, "corpusSha256": m["inputCorpusSha256"],
            "validationInputSha256": sha256(file_under(root, "validation.inputs.jsonl")),
            "validationCaseIds": sorted(partitions["validation"]), "trainingCases": len(partitions["training"]),
            "validationCases": len(partitions["validation"]), "reviewEvidence": "declared_not_authenticated",
            "holdoutCommitmentOnly": True, "protocolVersion": review["protocolVersion"]}
