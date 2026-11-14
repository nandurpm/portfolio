# Rich Android visual theme — 14 November 2026

Follow-up to the four-area Android redesign, based on main `972c94a52d9b4d7c31a61425ccbdc24335c41798` (2.10.12). The owner approved a richer indigo/lavender direction after finding the first presentation too plain.

## Visual direction

- A deep navy-to-indigo balance-card gradient, stronger amount typography, a translucent reporting-date inset and restrained depth.
- Mint income, coral expense/deficit and lavender savings cards, with aligned rounded icon badges and distinct readable values.
- A green Add action with a subtle gradient, plus clearer navigation selection through a pill, short indicator and heavier icon/label.
- Rounded transaction-type badges, layered account cards with type chips and stronger balance hierarchy.
- More/tool icon tones, grouped surfaces and bottom-sheet field styling coordinated with Home.
- A deep-navy dark variant with independently chosen pastel text and tinted surfaces, retaining the existing theme/palette controls.

Light tokens: mint `#e8f6ef` / income `#176046`; coral `#fff0ed` / expense `#993848`; lavender `#f0eaff` / movement `#583b91`. Dark tokens: mint `#193b33` / income `#a4e6c7`; coral `#402a35` / expense `#ffc0ca`; lavender `#322b50` / movement `#dfceff`.

## Scope and preservation

Styles remain in the Android-only stylesheet. The quick-action rows receive a data attribute for semantic icon coloring; handlers are unchanged. Android recent-record buttons derive accessible names from their visible record text; Website/Windows behavior is unchanged. Four-tab navigation, all screens, accounting, models, authentication, persistence, backup/restore, sync, native IDs and signing stay intact. No new dependencies, image downloads, blur filters, timers or continuous animations. Shadows and gradients are static; physical-device rendering performance remains unmeasured.

No version bump or publication is included. This is a reviewable styling PR; installed 2.10.12 copies require a later approved release to receive it.

## Verification

Two additional synthetic browser cases exercise light/dark Home, populated Activity/Accounts, transfer, quick actions and More. They check contrast/accessibility, horizontal overflow, aligned summary values, distinct surfaces, and unchanged stored records while producing screenshots. Existing large-text/small-viewport, six-palette, navigation, transfer/fee, backup/restore and financial suites remain applicable. CI results and screenshot-review evidence are recorded in the PR description. Browser simulation does not certify physical Android keyboard/TalkBack or GPU performance.
