#!/usr/bin/env python3
"""Regression tests for the weekly audit report evidence gate."""
import os
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

SCRIPT = Path(__file__).with_name("validate-weekly-audit-report.py")

class ReportGateTests(unittest.TestCase):
    def run_gate(self, body):
        with tempfile.TemporaryDirectory() as tmp:
            report = Path(tmp) / "report.md"
            report.write_text(body, encoding="utf-8")
            env = os.environ | {
                "AUDITED_SHA": "a" * 40,
                "AUDIT_DATE": "2026-11-12",
                "PRIMARY_MODEL": "gemini-test-model",
                "PRIMARY_RESULT": "success",
                "FALLBACK_MODEL": "gemini-fallback-test",
                "FALLBACK_RESULT": "skipped",
            }
            result = subprocess.run(
                [sys.executable, str(SCRIPT), str(report)],
                text=True, capture_output=True, env=env, check=True,
            )
            return report.read_text(encoding="utf-8"), result.stdout

    def test_unsupported_area_pass_is_downgraded(self):
        report, output = self.run_gate(
            "## Audit Area Status Summary\n"
            "| Audit Area | Status | Notes |\n|---|---|---|\n"
            "| Financial integrity | **PASS** | Read source only |\n"
        )
        self.assertIn("| Financial integrity | **NOT TESTED** |", report)
        self.assertIn("Static review only; runtime not tested.", report)
        self.assertIn("Audit-area statuses downgraded: 1", output)

    def test_delegated_ci_pass_is_downgraded_without_run_evidence(self):
        report, _ = self.run_gate(
            "## Audit Area Status Summary\n"
            "| Audit Area | Status | Notes |\n|---|---|---|\n"
            "| Tests & Build Automation | **PASS** (Delegated to CI) | No run URL or SHA |\n"
        )
        self.assertIn("| Tests & Build Automation | **NOT TESTED** |", report)

    def test_finding_pass_is_never_allowed(self):
        report, _ = self.run_gate(
            "## Findings Table\n"
            "| ID | Severity | Status |\n|---|---|---|\n"
            "| AUDIT-01 | Low | **PASS** |\n"
        )
        self.assertIn("| AUDIT-01 | Low | **POTENTIAL** |", report)

    def test_area_pass_requires_sha_command_and_success(self):
        sha = "a" * 40
        report, _ = self.run_gate(
            "## Audit Area Status Summary\n"
            "| Audit Area | Status | Evidence |\n|---|---|---|\n"
            f"| Web | **PASS** | npm run check passed at {sha} |\n"
        )
        self.assertIn("| Web | **PASS** |", report)

    def test_unsupported_no_defect_claim_is_qualified(self):
        report, _ = self.run_gate(
            "# Audit\n"
            "## 7. Unresolved Issues & Manual Approvals\n"
            "- No unaddressed defects requiring code changes.\n"
            "- No manual approvals required for source code changes since no changes were made.\n"
        )
        self.assertIn("No confirmed application defects were established during static review", report)
        self.assertIn("runtime, device, and backend checks marked NOT TESTED remain outstanding", report)

    def test_machine_metadata_is_appended(self):
        report, _ = self.run_gate("# Audit\n")
        self.assertIn("Exact audited commit SHA: " + "a" * 40, report)
        self.assertIn("Configured primary Gemini model: gemini-test-model", report)

if __name__ == "__main__":
    unittest.main(verbosity=2)
