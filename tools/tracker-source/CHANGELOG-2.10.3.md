# Savings & Expense Tracker 2.10.3

- Fix the Dashboard reporting controls on phone-width web and Windows layouts: the review-month picker no longer clips to "Nove", its icon and full month name share one row with Reset beside it, and the "Report through" and range controls sit in consistent bordered fields instead of white blocks on the tinted card. Verified at 320, 360, 390 and 480px.
- Add a browser regression for the month picker's width and overflow, and seeded property tests proving transfers, lending and FD movements never change income, expenses or net worth and that period totals and cash effect remain additive across month, year and leap-day boundaries.
- Android's separate dashboard layout, shared financial calculations, synchronization, application ID and signing configuration are unchanged.
