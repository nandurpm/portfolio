# SITTTR REV2026 course-name audit

This portfolio repository only contains the public project page for Diploma Notes; the live Diploma Notes subject database lives in the separate `nandurpm/diploma-notes` repository. This note records the official-source verification needed for that upstream dataset.

## Official source checked

- Official SITTTR Kerala REV2026 syllabus index: `https://sitttrkerala.ac.in/index.php?r=site%2Fdiploma-syllabus&scheme=REV2026`
- The index lists 38 REV2026 diploma programme schemes, from Architecture through Wood and Paper Technology.
- The upstream subject JSON currently records `programmeCount: 38`, `subjectCount: 2403`, and uses the official SITTTR REV2026 index as its source.

## Systematic corrections confirmed

These course codes are shared/common rows and should not inherit generic category labels from programme tables:

| Course code | Semester | Incorrect generated name | Official course name to use | Applies to |
| --- | --- | --- | --- | --- |
| `4001` | 4 | Humanities & Social Sciences | Entrepreneurship and Startup | All REV2026 programmes where the code appears |
| `5008` | 5 | PSI | Seminar | All REV2026 programmes where the code appears |

## Generator follow-up required in Diploma Notes repo

1. Patch the REV2026 generator so common course-code titles override category/table labels before emitting subject records.
2. Add a regression assertion that no emitted REV2026 subject record keeps `4001` as `Humanities & Social Sciences`.
3. Add a regression assertion that no emitted REV2026 subject record keeps `5008` as `PSI`.
4. Rebuild `assets/data/revision-2026-subjects.json` in `nandurpm/diploma-notes` and verify all 38 programmes after regeneration.
