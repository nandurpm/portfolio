# Tracker contrast verification (2 Nov 2026)
WCAG AA target: 4.5:1 normal text, 3:1 large text and meaningful controls.

The palette `--accent` is retained for decorative surfaces and focus outlines.
Normal text on light or `--accent-soft` backgrounds uses `--accent-ink`,
which maps to the palette's darker `--accent-deep`. Dark-theme accent ink
is #d5ceff. Muted dark text is lightened to #b3bdd2 and control borders are
separate from subtle layout separators.

| Palette | Accent on white (before) | New ink on white | New ink on soft |
| --- | ---: | ---: | ---: |
| Default | 5.41 | 8.62 | 7.37 |
| Ocean | 3.78 | 6.55 | 5.90 |
| Emerald | 3.45 | 5.26 | 4.70 |
| Rose | 4.03 | 5.83 | 5.29 |
| Sunset | 3.28 | 4.97 | 4.46 |
| Indigo | 5.23 | 7.61 | 6.67 |

Legacy light muted (#596579), green (#087861), orange (#95500c) and
red (#b33b59) on white each pass 4.5:1. Dark equivalents (#4ad0b1,
#ffb570, #f589a3) and new muted text pass on #1d2134. Ratios are
calculated from WCAG relative luminance of the literal variables, not
from a live-browser visual audit. Actual layered backgrounds, hover
states and theme/palette combinations still require visual QA.
