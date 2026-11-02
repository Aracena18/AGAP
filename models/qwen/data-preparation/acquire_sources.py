"""Fetch public references to an external cache and inventory local files by hash.

Never sends local content. No authentication, packages or model weights required.
Re-running refreshes acquisition evidence; review changed hashes before accepting it.
"""
import argparse
import hashlib
import json
import urllib.request
import urllib.error
from datetime import date
from pathlib import Path

from build import ROOT, write_json

COOP = [
    ("COOP-01", "DCCPEC MPC COMPLETE LOAN AND COLLECTION OPERATIONS MANUAL.docx", "Policy and 20 blank operational templates", "Version/effective date and listed conflicts need confirmation"),
    ("COOP-02", "LOAN APPLICATION FORM.docx", "Blank borrower application fields", "Same logical form as COOP-03; not independent examples"),
    ("COOP-03", "LOAN APPLICATION FORM - PDF.pdf", "Two-page blank application rendering", "Same logical form as COOP-02; keep all renders in one family"),
    ("COOP-04", "AUTHORITY TO DEDUCT WITH SPA.docx", "Salary deduction and authority template", "Exclude credential solicitation and unreviewed enforcement instructions"),
    ("COOP-05", "AFFIDAVIT-OF-UNDERTAKING-ASSIGNEMENT, AUTHORIZATIONAND-WAVIER-DCCPEC.docx", "Undertaking and assignment template", "Exclude credential solicitation and unreviewed enforcement instructions"),
    ("COOP-06", "HOLD-OUT-AGREEMENT.docx", "Share/savings restrictions and default provisions", "Reconcile default trigger with note; not a spendable-cash statement"),
    ("COOP-07", "Revised - COMPREHENSIVE PROMISSORY NOTE.docx", "Loan terms and payment/default clauses", "Blank terms; reconcile allocation/default with manual and hold-out"),
    ("COOP-08", "DATA PRIVACY CONSENT FORM.docx", "Lending/data-sharing consent template", "Does not expressly authorize model fine-tuning or external AI processing"),
]
PUBLIC = [
    ("CFPB-INCOME", "income_benefits_tool_2018-11_ADA.pdf", "Income basis, frequency and irregular receipts"),
    ("CFPB-SPENDING", "spending_tracker_2018-11_ADA.pdf", "Relevant household cost categories"),
    ("CFPB-CALENDAR", "bill_calendar_tool_2018-11_ADA.pdf", "Actual payment dates and recurring due days"),
    ("CFPB-CASHFLOW", "cash_flow_budget_tool_2018-11_ADA.pdf", "Opening available cash and timing of inflows/outflows"),
    ("CFPB-DEBT", "debt_log_tool_2018-11_ADA.pdf", "Existing obligations, payment amount and due date"),
    ("CFPB-EVENTS", "events-purchases_tool_2018-11.pdf", "Non-monthly life-event and purchase costs"),
]
LOCAL_CONTEXT = [
    ("BSP-FINED", "https://www.bsp.gov.ph/Pages/InclusiveFinance/FinancialEducationLearningModules.aspx",
     "Philippine financial-planning, budgeting and debt-management educational context",
     "Link and original short description only; site marks rights reserved; no source text or slides redistributed"),
    ("CDA-5C", "https://cda.gov.ph/updates/csf-cooperatives-elevate-expertise-on-loan-evaluation-and-credit-appraisal/",
     "2023 CSF cooperative training report describes the same five C headings",
     "Page public-domain notice unless otherwise stated; link and original short description only"),
]
GRETEL = "gretelai/synthetic_pii_finance_multilingual"


def fetch(url, cache, name):
    req = urllib.request.Request(url, headers={"User-Agent": "AGAP-dataset-review/0.1"})
    with urllib.request.urlopen(req, timeout=35) as response:
        data = response.read(4_000_001)
        headers = dict(response.headers)
    if len(data) > 4_000_000:
        raise ValueError("Unexpected source size; no automatic bulk acquisition")
    (cache / name).write_bytes(data)
    return data, headers, hashlib.sha256(data).hexdigest()


def acquire(source_root, cache):
    cache.mkdir(parents=True, exist_ok=True)
    today = date.today().isoformat()
    documents = []
    for ident, filename, use, limitation in COOP:
        relative = "docs/DCCPEC-Docs/" + filename
        p = source_root / relative
        data = p.read_bytes()
        documents.append(dict(id=ident, path=relative, sha256=hashlib.sha256(data).hexdigest(),
                              bytes=len(data), structural_use=use, limitation=limitation,
                              kind="user_supplied_blank_template_or_policy", raw_bundled=False,
                              permission_for_external_model_training="not_established"))
    write_json(ROOT / "sources/cooperative_inventory.json", dict(
        inventoried_on=today, original_files_in_separate_user_worktree=True,
        review_method="DOCX body/tables/headers extracted locally; embedded workflow images visually inspected; application PDF inspected; text offsets in extracted DOCX are not page numbers",
        limitations="No operative policy certification, completed member records, or approved gold 5C assessments supplied",
        documents=documents))

    notice_url = "https://www.consumerfinance.gov/privacy/website-privacy-policy/"
    # The official page was verified in the research browser. Direct acquisition
    # may return 403; record that instead of inventing a downloaded-file hash.
    try:
        _, _, notice_hash = fetch(notice_url, cache, "cfpb-legal-notices.html")
        notice_status = "downloaded"
    except (urllib.error.URLError, TimeoutError) as error:
        notice_hash = None
        notice_status = f"research_browser_verified; direct_fetch_failed: {error}"
    refs = []
    for ident, suffix, use in PUBLIC:
        url = "https://files.consumerfinance.gov/f/documents/cfpb_your-money-your-goals_" + suffix
        try:
            data, _, digest = fetch(url, cache, ident + ".pdf")
            if not data.startswith(b"%PDF-"):
                raise ValueError(f"Not a PDF: {ident}")
            fetch_status = "downloaded"
        except (urllib.error.URLError, TimeoutError) as error:
            data, digest = b"", None
            fetch_status = f"official_toolkit_link_verified; direct_fetch_failed: {error}"
        refs.append(dict(id=ident, url=url, accessed_on=today, sha256=digest,
                         source_kind="public_structural_reference_not_labeled_microdata",
                         direct_fetch_status=fetch_status,
                         research_browser_review="official toolkit link/description verified; PDF body unavailable" if ident in ("CFPB-CASHFLOW", "CFPB-EVENTS") else "official toolkit and PDF text inspected",
                         use=use, included_as="category/timing concepts in original fictional examples",
                         license_evidence_url=notice_url, license_evidence_sha256=notice_hash,
                         license_evidence_status=notice_status,
                         rights_note="CFPB-created information is public domain; third-party material may have separate rights. No logos or endorsement included.",
                         exclusions="No US benefit assumptions, loan eligibility, credit scoring, dollar thresholds or borrower rows imported",
                         raw_bundled=False))
        print(f"{ident}: {fetch_status}; {len(data)} bytes cached", flush=True)

    for ident, url, use, rights in LOCAL_CONTEXT:
        try:
            _, _, digest = fetch(url, cache, ident + ".html")
            fetch_status = "downloaded"
        except (urllib.error.URLError, TimeoutError) as error:
            digest = None
            fetch_status = f"research_browser_verified; direct_fetch_failed: {error}"
        refs.append(dict(id=ident, url=url, accessed_on=today, sha256=digest,
                         source_kind="Philippine_public_context_reference_not_labeled_data",
                         use=use, rights_note=rights, direct_fetch_status=fetch_status,
                         limitations="Not cooperative policy, an applicable legal ruling, expert assessment labels or an endorsement",
                         raw_bundled=False))

    api = "https://huggingface.co/api/datasets/" + GRETEL
    metadata, _, _ = fetch(api, cache, "gretel-metadata.json")
    revision = json.loads(metadata)["sha"]
    card_url = f"https://huggingface.co/datasets/{GRETEL}/raw/{revision}/README.md"
    card, _, card_hash = fetch(card_url, cache, "gretel-README.md")
    assert "license: apache-2.0" in card.decode()
    rows_url = f"https://datasets-server.huggingface.co/rows?dataset={GRETEL}&config=default&split=train&offset=0&length=20"
    payload, headers, payload_hash = fetch(rows_url, cache, "gretel-public-sample.json")
    header_revision = next((v for k, v in headers.items() if k.lower() == "x-revision"), None)
    assert header_revision == revision, "Dataset viewer revision does not match pinned source card"
    sample = json.loads(payload)["rows"]
    profiles = []
    for item in sample:
        row = item["row"]
        spans = row.get("pii_spans", [])
        if isinstance(spans, str):
            spans = json.loads(spans)
        profiles.append(dict(row_idx=item["row_idx"], document_type=row["document_type"],
                             expanded_type=row["expanded_type"], language=row["language"],
                             text_sha256=hashlib.sha256(row["generated_text"].encode()).hexdigest(),
                             text_characters=len(row["generated_text"]),
                             annotation_count=len(spans),
                             annotation_labels=sorted({p["label"] for p in spans}),
                             admitted_to_core=False))
    write_json(ROOT / "sources/gretel_sample_audit.json", dict(
        source=GRETEL, revision=revision, source_split="train", access_url=rows_url,
        observed_revision_header=header_revision, acquired_on=today, response_sha256=payload_hash,
        scope="First 20 rows, convenience fit audit only; not representative sampling or a benchmark",
        retained="Metadata and hashes only; no generated text, names, account values or secret values",
        disposition="Excluded from core 5C pilot; possible future separate PII-span technical diagnostics after label review",
        limitations="Foreign synthetic document formats and privacy labels; no cooperative interviews or expert 5C labels. Producer card prose and YAML list different split sizes; no total-size claim relies on it.",
        profiles=profiles))
    refs.append(dict(id="GRETEL-PII", url="https://huggingface.co/datasets/" + GRETEL,
                     accessed_on=today, revision=revision, card_url=card_url, card_sha256=card_hash,
                     license="Apache-2.0 as declared by creator card", source_kind="public_synthetic_finance_dataset",
                     use="20-row suitability audit; core training admission false",
                     limitation="PII labels are not 5C labels; foreign policy/text not imported; automated labels may be erroneous",
                     raw_bundled=False))
    write_json(ROOT / "sources/public_sources.json", dict(
        acquired_on=today, no_local_content_uploaded=True,
        references=refs, counts=dict(structural_references=6, Philippine_context_references=2,
                                    synthetic_dataset_audit_rows=len(profiles), public_borrower_rows_in_core=0)))
    print(f"Inventoried {len(documents)} cooperative files and {len(refs)} public sources; no public borrower rows admitted to core.")


if __name__ == "__main__":
    p = argparse.ArgumentParser()
    p.add_argument("--source-root", required=True, type=Path)
    p.add_argument("--cache-dir", required=True, type=Path)
    a = p.parse_args()
    assert not a.cache_dir.resolve().is_relative_to(ROOT.resolve()), "Keep raw public cache outside Git package"
    acquire(a.source_root, a.cache_dir)
