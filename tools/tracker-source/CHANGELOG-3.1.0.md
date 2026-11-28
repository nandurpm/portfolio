## Savings and Expense Tracker 3.1.0

- Corrects EMI closure savings by comparing the lender quote with installments actually avoided at the report cutoff. Preserves older receipt records when calculating savings.
- Gives unresponsive cloud plan requests a 20-second deadline, retains local changes, and keeps the same save ID when retrying an unchanged request.
- Uses one application version across Web, Android, and Windows. Android version code: 30100.
- Existing profiles, the JSON backup format, and the Android app identity are unchanged. Back up your plan before upgrading and install over the existing app rather than uninstalling it.
