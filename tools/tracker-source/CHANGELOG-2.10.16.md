# Savings and Expense Tracker 2.10.16

Expense-category clarity release.

## Separate expense categories

New default plans now include two distinct Living categories: **Tea and Snacks** and **Travel**. This avoids combining tea purchases and travel expenses under one label and keeps their budgets, entries, filters, reports, and exports separately identifiable.

Existing saved plans are not automatically renamed or rewritten. This protects historical entries; users can add the two categories from Budget & Plan when upgrading an existing plan.

## Verification

The category regression test passes alongside the full suite: 50 test files and 291 tests. Lint and TypeScript quality checks also pass.
