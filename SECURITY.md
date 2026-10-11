# Security policy

CT Edu is an early-stage educational prototype, not a clinical system. The repository is still in pre-release review; there are no production-supported releases at this time.

## Reporting a vulnerability

Please do **not** publish exploitable details, sensitive logs, or a proof of concept in a public issue or discussion.

1. If GitHub private vulnerability reporting is enabled for this repository, use **Security → Report a vulnerability** to submit a private report.
2. If that option is not available, contact the repository maintainer privately through their GitHub profile before sharing technical details publicly.
3. Include the affected commit or URL, impact, concise reproduction steps, and any suggested mitigation. Do not include real patient images, protected health information, personal identifiers, access tokens, local progress backups, bookmark backups, or note text.

The project is maintained as a prototype, so a response time or remediation deadline is not guaranteed. Reports will be reviewed as maintainer capacity permits.

## Scope and limitations

- The current app is a static educational site. It does not offer accounts, an application API, clinical data submission, or cross-device sync.
- Active-recall history and exported backups can contain lesson identifiers, selected answers, correctness, and timestamps. Local bookmarks add case/slice coordinates, selected structure, and optional free-text notes. They stay in browser storage unless a learner exports or shares a backup; learners should never enter patient identifiers or real clinical reports.
- The page currently requests stylesheet/font resources from Google Fonts; the privacy notice documents that external request.
- A Content Security Policy meta directive, DOM-based rendering, input-focused smoke tests, and immutable GitHub Actions references are in place as targeted safeguards. These do not establish that the app is fully secure or clinically validated.
- Source-dataset redistribution and medical-content validation remain independent release blockers.
- The current app accepts optional plain-text bookmark notes. DOM text rendering prevents notes from being interpreted as markup, but notes and exported backups are not encrypted; do not put patient data or sensitive clinical material in them.
