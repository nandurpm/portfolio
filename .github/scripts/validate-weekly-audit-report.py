#!/usr/bin/env python3
"""Conservatively normalize unsupported PASS labels in weekly Gemini audit reports."""
from __future__ import annotations
import os, re, sys
from pathlib import Path

if len(sys.argv) != 2:
    raise SystemExit("usage: validate-weekly-audit-report.py REPORT.md")
path = Path(sys.argv[1])
if not path.is_file() or path.is_symlink():
    raise SystemExit(f"report is missing or unsafe: {path}")
text = path.read_text(encoding="utf-8")
sha = os.environ.get("AUDITED_SHA", "")
audit_date = os.environ.get("AUDIT_DATE", "unknown")
primary_model = os.environ.get("PRIMARY_MODEL", "unknown")
primary_result = os.environ.get("PRIMARY_RESULT", "unknown")
fallback_model = os.environ.get("FALLBACK_MODEL", "unknown")
fallback_result = os.environ.get("FALLBACK_RESULT", "unknown")

sha_pattern = re.compile(r"\b[0-9a-f]{40}\b", re.I)
command_pattern = re.compile(r"(?:\bnpm\s+(?:run|test|ci)|\bnpx\b|\bpnpm\b|\byarn\b|\bgradlew\b|\bgh\s+run\b|github\.com/[^ \])]+/actions/runs/\d+)", re.I)
success_pattern = re.compile(r"\b(?:passed|success|successful|exit\s+code\s+0)\b", re.I)
def has_evidence(row: str) -> bool:
    return bool(sha_pattern.search(row) and command_pattern.search(row) and success_pattern.search(row))
def bounds(lines, pattern):
    start = next((i + 1 for i, line in enumerate(lines) if re.match(pattern, line.strip(), re.I)), None)
    if start is None: return None
    end = next((i for i in range(start, len(lines)) if re.match(r"^#{1,6}\s+", lines[i])), len(lines))
    return start, end
def cells(line): return [x.strip() for x in line.strip().strip("|").split("|")]
def replace_cell(line, idx, value):
    c = cells(line); c[idx] = value
    return "| " + " | ".join(c) + " |"

lines = text.splitlines()
area_changes, finding_changes = [], []
area = bounds(lines, r"^#{1,6}\s+.*Audit Area Status Summary")
if area:
    start, end = area
    h = next((i for i in range(start, end) if "|" in lines[i] and any("audit area" in c.lower() for c in cells(lines[i])) and any(c.lower() == "status" for c in cells(lines[i]))), None)
    if h is not None:
        idx = next(i for i,c in enumerate(cells(lines[h])) if c.lower() == "status")
        for i in range(h + 2, end):
            if "|" not in lines[i] or re.match(r"^\s*\|?[\s:|-]+\|?\s*$", lines[i]): continue
            c = cells(lines[i])
            if len(c) > idx and c[idx].strip("* ").upper().startswith("PASS") and not has_evidence(lines[i]):
                updated = replace_cell(lines[i], idx, "**NOT TESTED**")
                row_cells = cells(updated)
                if len(row_cells) >= 3 and "static review only" not in row_cells[-1].lower():
                    row_cells[-1] = row_cells[-1].rstrip() + " Static review only; runtime not tested."
                    updated = "| " + " | ".join(row_cells) + " |"
                lines[i] = updated
                area_changes.append(c[0])
else:
    area_changes.append("Audit area summary missing")

finding = bounds(lines, r"^#{1,6}\s+.*Findings Table")
if finding:
    start, end = finding
    h = next((i for i in range(start, end) if "|" in lines[i] and any(c.lower() in ("id", "finding id") for c in cells(lines[i])) and any(c.lower() == "status" for c in cells(lines[i]))), None)
    if h is not None:
        idx = next(i for i,c in enumerate(cells(lines[h])) if c.lower() == "status")
        for i in range(h + 2, end):
            if "|" not in lines[i] or re.match(r"^\s*\|?[\s:|-]+\|?\s*$", lines[i]): continue
            c = cells(lines[i])
            if len(c) > idx and c[idx].strip("* ").upper().startswith("PASS"):
                replacement = "**RESOLVED**" if "RESOLVED" in c[idx].upper() and has_evidence(lines[i]) else "**POTENTIAL**"
                lines[i] = replace_cell(lines[i], idx, replacement)
                finding_changes.append(c[0])

text = "\n".join(lines).rstrip() + "\n"
# Remove common overclaims produced by static-only review sessions.
text = re.sub(
    r"(?i)verified as sound, stable, and fully tested",
    "reviewed statically only; application correctness and runtime behavior were NOT TESTED by the Gemini stage",
    text,
)
text = re.sub(
    r"(?i)verified integer-paise representation and calculation flows",
    "static review inspected integer-paise representation and calculation flows; runtime behavior was NOT TESTED by the Gemini stage",
    text,
)
text = re.sub(
    r"(?im)^- No unaddressed defects requiring code changes\\.$",
    "- No confirmed defects were reproduced by executable tests in this Gemini stage; runtime verification remains NOT TESTED until independent CI results are attached.",
    text,
)
text = re.sub(
    r"(?im)^- No manual approvals required for source code changes since no changes were made\\.$",
    "- No source changes were proposed in this run; runtime, device, and backend checks marked NOT TESTED remain outstanding.",
    text,
)
metadata = f"""
## Workflow execution metadata (machine-recorded)

- Audit date (Asia/Kolkata): {audit_date}
- Exact audited commit SHA: {sha or "unavailable"}
- Configured primary Gemini model: {primary_model}
- Primary Gemini action result: {primary_result}
- Fallback Gemini model: {fallback_model}
- Fallback Gemini action result: {fallback_result}

## Automated report evidence gate

This gate checks report labels and provenance formatting; it does not test application correctness.

- Audit-area PASS labels downgraded to NOT TESTED for missing same-row evidence: {len(area_changes)}
- Invalid finding-level PASS labels normalized: {len(finding_changes)}
- An audit-area PASS is valid only when its row records an executed command or workflow URL, exact commit SHA, and successful result.
- A finding must use CONFIRMED, POTENTIAL, RESOLVED, NOT REPRODUCED, or DEFERRED; PASS is not a finding status.
- Static inspection, test-file existence, a successful Gemini action, or a previous release are not runtime verification.
- Prose claims without exact current-run evidence are static-review commentary, not a test/build/device PASS.
- Production services and user data remain NOT ACCESSED unless separately authorized.
"""
if "## Automated report evidence gate" not in text:
    text += metadata
path.write_text(text, encoding="utf-8")
print(f"Audit-area statuses downgraded: {len(area_changes)}")
print(f"Finding statuses normalized: {len(finding_changes)}")
print("Audit-area rows: " + (", ".join(area_changes) if area_changes else "none"))
print("Finding rows: " + (", ".join(finding_changes) if finding_changes else "none"))
print("Report evidence gate: completed")
