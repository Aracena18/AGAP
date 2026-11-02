"""Offline integrity checks. Passing these is not expert or cooperative validation."""
import argparse
import csv
import datetime
import hashlib
import json
import re
from decimal import Decimal
from pathlib import Path

from build import CS, MONEY_FIELDS, ROOT


def walk(value):
    if isinstance(value, dict):
        yield value
        for v in value.values():
            yield from walk(v)
    elif isinstance(value, list):
        for v in value:
            yield from walk(v)


def validate_row(row):
    assert row["fictional"] is True and row["expert_label"] is False
    assert row["review_status"] == "pending" and row["training_eligible"] is False
    assert row["split"] == "development_review", "No trainer-created holdout is allowed in this pilot"
    docs = {d["id"]: d for d in row["input"]["documents"]}
    assert len(docs) == len(row["input"]["documents"])
    for doc in docs.values():
        assert doc["fictional"] and doc["independent_verification"] == "not_performed"
    assert row["input"]["checked_assessment"] is None
    for node in walk(row["candidate_target"]):
        assert not ({"approval", "credit_score", "probability_of_default", "computed_affordability", "decision"} & node.keys()), "AI authority or arithmetic field"
        if "evidence" in node:
            e = node["evidence"]
            assert e["source_id"] in docs, "Future or missing source referenced"
            text = docs[e["source_id"]]["text"]
            assert type(e["start"]) is int and type(e["end"]) is int
            assert 0 <= e["start"] < e["end"] <= len(text)
            assert text[e["start"]:e["end"]] == e["quote"], "Source span mismatch"
        if "field" in node and "value" in node:
            v = node["value"]
            assert node["independent_verification"] == "not_performed"
            if v is None:
                assert node["status"] == "unavailable" and node.get("missing_reason")
            else:
                assert node["status"] == "source_asserted"
            if node["field"] in MONEY_FIELDS:
                assert v is None or type(v) is int, "Money must be integer centavos, not booleans/floats"
                assert node["unit"] == "PHP_centavos"
                if v is not None:
                    # Lexical unit conversion only, not a financial calculation.
                    amounts = re.findall(r"PHP ([0-9][0-9,]*(?:\.[0-9]{1,2})?)", node["evidence"]["quote"])
                    anchored = {int(Decimal(a.replace(",", "")) * 100) for a in amounts}
                    assert v in anchored, "Money value is not anchored in the quoted source"
            if (node["field"].endswith("_date") and isinstance(v, str)):
                assert datetime.date.fromisoformat(v).isoformat() == v
                assert v in node["evidence"]["quote"], "Date not anchored in source"
    if row["task"] in ("extract_initial", "ask_initial"):
        assert all(not d.endswith("-reply") for d in docs), "Future reply leaked into initial task"
    if row["task"] == "ask_initial":
        # Reference IDs are known to be in the separate extraction task, not future replies.
        assert all(not a.startswith(row["family_id"] + "-reply-") for a in row["candidate_target"]["basis_assertion_ids"])
    if row["task"] == "draft_five_cs":
        t = row["candidate_target"]
        assert set(t["five_cs"]) == set(CS)
        assert t["label"] == "draft_for_staff_review" and t["human_review_required"]
        assert t["checked_assessment"] == dict(status="not_supplied", reference=None)
        for section in t["five_cs"].values():
            assert section["coverage"] == ("source_assertions_only" if section["observations"] else "not_supplied")


def validate_package(root=ROOT, source_root=None):
    rows = [json.loads(line) for line in (root / "candidate/examples.jsonl").read_text().splitlines()]
    ids = [r["id"] for r in rows]
    assert len(ids) == len(set(ids))
    families = json.loads((root / "candidate/families.json").read_text())
    assert len(families) == 12 and len(rows) == 60
    for family in families:
        members = [r for r in rows if r["family_id"] == family["family_id"]]
        assert set(family["task_ids"]) == {r["id"] for r in members} and len(members) == 5
        assert len({r["split"] for r in members}) == 1
        initial = next(r for r in members if r["task"] == "extract_initial")
        initial_ids = {a["id"] for a in initial["candidate_target"]["candidate_assertions"]}
        question = next(r for r in members if r["task"] == "ask_initial")
        assert set(question["candidate_target"]["basis_assertion_ids"]) <= initial_ids
        interpreted = next(r for r in members if r["task"] == "interpret_reply")
        final_ids = {a["id"] for a in interpreted["candidate_target"]["candidate_assertions"]}
        drafted = next(r for r in members if r["task"] == "draft_five_cs")
        observed_ids = {n["assertion_id"] for n in walk(drafted["candidate_target"]) if "assertion_id" in n}
        assert observed_ids == final_ids, "5C observations lost or invented assertions"
    for row in rows:
        validate_row(row)
    manifest = json.loads((root / "candidate/manifest.json").read_text())
    assert manifest["training_export_allowed"] is False and manifest["untouched_holdout_exists"] is False
    for path, digest in manifest["hashes"].items():
        assert hashlib.sha256((root / path).read_bytes()).hexdigest() == digest, f"Changed artifact: {path}"
    with (root / "review/annotation_sheet.csv").open(newline="") as f:
        annotations = list(csv.DictReader(f))
    assert len(annotations) == len(rows)
    assert {r["task_id"] for r in annotations} == set(ids)
    for row in rows:
        annotation = next(a for a in annotations if a["task_id"] == row["id"])
        actual = hashlib.sha256(json.dumps(row, ensure_ascii=False, sort_keys=True).encode()).hexdigest()
        assert actual == annotation["candidate_sha256"], f"Review sheet stale for {row['id']}"
    with (root / "spec/field_dictionary.csv").open(newline="") as f:
        fields = {r["field"] for r in csv.DictReader(f)}
    used_fields = {n["field"] for r in rows for n in walk(r["candidate_target"]) if "field" in n}
    used_fields |= {f for c in __import__("pilot_cases").CASES for f in c["missing"]}
    assert not used_fields - fields, f"Undocumented fields: {used_fields - fields}"
    local_sources = json.loads((root / "sources/cooperative_inventory.json").read_text())
    assert len(local_sources["documents"]) == 8
    if source_root:
        for item in local_sources["documents"]:
            p = Path(source_root) / item["path"]
            assert hashlib.sha256(p.read_bytes()).hexdigest() == item["sha256"], f"Original source changed: {p.name}"
    return rows


def require_training_ready(rows):
    # Deliberately no override flag. Earl must supply a separately reviewed corpus/splits.
    if any(r["review_status"] != "accepted" or not r["training_eligible"] for r in rows):
        raise ValueError("Review-only candidate: receive corrected, approved training/validation manifests from Earl before training.")


if __name__ == "__main__":
    p = argparse.ArgumentParser()
    p.add_argument("--source-root", type=Path)
    p.add_argument("--require-training-ready", action="store_true")
    args = p.parse_args()
    rows = validate_package(source_root=args.source_root)
    if args.require_training_ready:
        require_training_ready(rows)
    print(f"PASS: {len(rows)} review candidates; source links, fields, spans, family membership, review hashes and artifact hashes checked. Not training approval.")
