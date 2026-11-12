#!/usr/bin/env python3
"""Redact disposable and production-shaped Supabase credentials from CLI output."""
from __future__ import annotations
import re
import sys

_PATTERNS = (
    (re.compile(r"\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b"), "[REDACTED_JWT]"),
    (re.compile(r"\bsb_(?:secret|publishable)_[A-Za-z0-9_-]{8,}\b"), "[REDACTED_SUPABASE_KEY]"),
    (re.compile(r"\b(postgres(?:ql)?://)[^\s\"'<>]+", re.I), r"\1[REDACTED_DATABASE_URI]"),
    (re.compile(r"\b((?:SUPABASE_)?(?:SERVICE_ROLE_KEY|ANON_KEY|JWT_SECRET|DB_PASSWORD|POSTGRES_PASSWORD)\s*[:=]\s*)[^\s,]+", re.I), r"\1[REDACTED]"),
    (re.compile(r"\b((?:service[_ -]?role(?:\s+key)?|anon(?:ymous)?\s+key|JWT secret|DB URL|API URL)\s*[:=]\s*)\S+", re.I), r"\1[REDACTED]"),
)

def redact(text: str) -> str:
    for pattern, replacement in _PATTERNS:
        text = pattern.sub(replacement, text)
    return text

if __name__ == "__main__":
    sys.stdout.write(redact(sys.stdin.read()))
