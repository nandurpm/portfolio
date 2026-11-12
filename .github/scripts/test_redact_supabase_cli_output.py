#!/usr/bin/env python3
"""Regression tests for Supabase CLI log redaction."""
import unittest
from redact_supabase_cli_output import redact

class SupabaseLogRedactionTests(unittest.TestCase):
    def test_redacts_supabase_secret_and_publishable_keys(self):
        text = "Secret sb_secret_abcdefghijklmnop Publishable sb_publishable_abcdefghijklmnop"
        result = redact(text)
        self.assertNotIn("sb_secret_abcdefghijklmnop", result)
        self.assertNotIn("sb_publishable_abcdefghijklmnop", result)
        self.assertEqual(result.count("[REDACTED_SUPABASE_KEY]"), 2)

    def test_redacts_jwt(self):
        token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ0ZXN0In0.signaturevalue123456"
        result = redact("JWT " + token)
        self.assertNotIn(token, result)
        self.assertIn("[REDACTED_JWT]", result)

    def test_redacts_database_uri(self):
        uri = "postgresql://postgres:disposable-password@127.0.0.1:5432/postgres"
        result = redact("DB " + uri)
        self.assertNotIn("disposable-password", result)
        self.assertIn("[REDACTED_DATABASE_URI]", result)

    def test_redacts_named_secret_assignments(self):
        result = redact("SUPABASE_SERVICE_ROLE_KEY=secret-value JWT secret: jwt-value")
        self.assertNotIn("secret-value", result)
        self.assertNotIn("jwt-value", result)

    def test_preserves_safe_status_text(self):
        text = "Started local Supabase stack successfully on 127.0.0.1"
        self.assertEqual(redact(text), text)

if __name__ == "__main__":
    unittest.main(verbosity=2)
