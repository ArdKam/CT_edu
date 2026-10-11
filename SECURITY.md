# Security policy

CT Edu is an early-stage educational prototype, not a clinical system. The repository is still in pre-release review; there are no production-supported releases at this time.

## Reporting a vulnerability

Please do **not** publish exploitable details, sensitive logs, or a proof of concept in a public issue or discussion.

1. If GitHub private vulnerability reporting is enabled for this repository, use **Security → Report a vulnerability** to submit a private report.
2. If that option is not available, contact the repository maintainer privately through their GitHub profile before sharing technical details publicly.
3. Include the affected commit or URL, impact, concise reproduction steps, and any suggested mitigation. Do not include real patient images, protected health information, personal identifiers, access tokens, or local progress-backup files.

The project is maintained as a prototype, so a response time or remediation deadline is not guaranteed. Reports will be reviewed as maintainer capacity permits.

## Scope and limitations

- The current app is a static educational site. It does not offer accounts, an application API, clinical data submission, or cross-device sync.
- Active-recall history and exported backups can contain lesson identifiers, selected answers, correctness, and timestamps. They are stored locally unless a learner explicitly exports or shares a backup.
- The page currently requests stylesheet/font resources from Google Fonts; the privacy notice documents that external request.
- A Content Security Policy meta directive, DOM-based rendering, input-focused smoke tests, and immutable GitHub Actions references are in place as targeted safeguards. These do not establish that the app is fully secure or clinically validated.
- Source-dataset redistribution and medical-content validation remain independent release blockers.
