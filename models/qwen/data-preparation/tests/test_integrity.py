"""Regression tests for real dataset integrity failures, without model/GPU use."""
import copy
import json
import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from build import ROOT, records
from validate import require_training_ready, validate_package, validate_row


class IntegrityTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.rows, cls.families = records()

    def task(self, ident):
        return copy.deepcopy(next(r for r in self.rows if r["id"] == ident))

    def test_complete_offline_package(self):
        self.assertEqual(len(validate_package()), 60)

    def test_builder_matches_checked_in_targets(self):
        actual = [json.loads(line) for line in (ROOT / "candidate/examples.jsonl").read_text().splitlines()]
        self.assertEqual(self.rows, actual)

    def test_missing_expense_is_not_zero(self):
        r = self.task("P06-extract_initial")
        a = r["candidate_target"]["candidate_assertions"][-1]
        self.assertIsNone(a["value"])
        a["value"] = 0
        with self.assertRaises(AssertionError):
            validate_row(r)

    def test_zero_after_reply_preserves_missing_history(self):
        r = self.task("P06-interpret_reply")
        values = [a["value"] for a in r["candidate_target"]["candidate_assertions"] if a["field"] == "expenses.transport_amount"]
        self.assertEqual(values, [None, 0])
        validate_row(r)

    def test_future_reply_is_rejected(self):
        r = self.task("P01-extract_initial")
        late = self.task("P01-interpret_reply")["candidate_target"]["candidate_assertions"][-1]
        r["candidate_target"]["candidate_assertions"].append(late)
        with self.assertRaisesRegex(AssertionError, "Future or missing"):
            validate_row(r)

    def test_future_reply_document_not_visible_early(self):
        r = self.task("P01-ask_initial")
        r["input"]["documents"].append(self.task("P01-interpret_reply")["input"]["documents"][-1])
        with self.assertRaisesRegex(AssertionError, "Future reply leaked"):
            validate_row(r)

    def test_fabricated_quote_rejected(self):
        r = self.task("P02-extract_initial")
        r["candidate_target"]["candidate_assertions"][-1]["evidence"]["quote"] = "Income verified by employer."
        with self.assertRaisesRegex(AssertionError, "span mismatch"):
            validate_row(r)

    def test_floating_point_money_rejected(self):
        r = self.task("P01-extract_initial")
        next(a for a in r["candidate_target"]["candidate_assertions"] if a["field"] == "income.net_amount")["value"] = 3000.0
        with self.assertRaisesRegex(AssertionError, "integer centavos"):
            validate_row(r)

    def test_unsupported_integer_amount_rejected(self):
        r = self.task("P02-extract_initial")
        r["candidate_target"]["candidate_assertions"][-1]["value"] = 9900000
        with self.assertRaisesRegex(AssertionError, "not anchored"):
            validate_row(r)

    def test_model_cannot_upgrade_verification(self):
        r = self.task("P09-extract_initial")
        r["candidate_target"]["candidate_assertions"][-1]["independent_verification"] = "verified"
        with self.assertRaises(AssertionError):
            validate_row(r)

    def test_two_review_cases_have_evidence_under_all_five_headings(self):
        for cid in ("P01", "P09"):
            sections = self.task(cid + "-draft_five_cs")["candidate_target"]["five_cs"]
            self.assertTrue(all(s["observations"] for s in sections.values()))

    def test_conflicts_are_not_silently_collapsed(self):
        r = self.task("P07-interpret_reply")
        conflicts = [a for a in r["candidate_target"]["candidate_assertions"] if a.get("conflict_group") == "income-current"]
        self.assertEqual([a["value"] for a in conflicts], [2400000, 2100000])
        self.assertTrue(all(a["independent_verification"] == "not_performed" for a in conflicts))

    def test_all_five_headings_required(self):
        r = self.task("P09-draft_five_cs")
        del r["candidate_target"]["five_cs"]["character"]
        with self.assertRaises(AssertionError):
            validate_row(r)

    def test_ai_decision_field_rejected(self):
        r = self.task("P11-draft_five_cs")
        r["candidate_target"]["decision"] = "approve"
        with self.assertRaisesRegex(AssertionError, "AI authority"):
            validate_row(r)

    def test_trainer_cannot_claim_holdout(self):
        r = self.task("P04-draft_five_cs")
        r["split"] = "holdout"
        with self.assertRaisesRegex(AssertionError, "trainer-created holdout"):
            validate_row(r)

    def test_pending_labels_block_training(self):
        with self.assertRaisesRegex(ValueError, "Review-only candidate"):
            require_training_ready(self.rows)

    def test_safety_examples_do_not_request_secret_values(self):
        # A narrow regression check for this pilot, not a general credential scanner.
        row = self.task("P12-ask_initial")
        self.assertIn("Please do not send a PIN or password", row["candidate_target"]["question"])
        self.assertNotRegex(row["candidate_target"]["question"].lower(), r"\bapprove\s+(?:you|your loan)\b")
        self.assertFalse(self.task("P11-draft_five_cs")["training_eligible"])


if __name__ == "__main__":
    unittest.main()
