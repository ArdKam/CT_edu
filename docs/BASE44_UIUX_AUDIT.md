# Base44 → CT-Edu: UI/UX and product audit

Date: 2026-10-17  
Target Base44 app: CT-Edu (`6ad27ec2922c0d629841a10e`)  
Destination: `ArdKam/CT_edu`

## Executive decision

Treat Base44 as the user's preferred design/interaction reference and as a source of one additional abdominal CT image stack. Keep GitHub CT-Edu as the canonical learning application. Port valuable presentation and workflows into GitHub incrementally; do not replace its three-plane SPL viewer, review gates, local progress tools, privacy controls, tests, or controlled Pages deployment.

## Evidence actually inspected

- Base44 app listing and main branch.
- Base44 entity schemas for `Dataset`, `AnatomicalStructure`, `ClinicalCase`, `QuizQuestion`, and `User`.
- Stored Base44 records for each content entity, including the 320 source image URLs.
- Current GitHub `README.md`, `index.html`, `src/styles.css`, `src/app.js`, modality catalog, dataset manifest, case-authoring contract, release gates, and existing tests.
- The original Wikimedia Commons source page, which describes the series as contrast CT with 3 mm slice thickness and states CC0 licensing.

## Access limitation — visual audit is incomplete

The connected Base44 account exposes entity data but not a read-only preview URL or rendered screenshots. Direct Base44 sandbox source inspection was rejected because the current workspace plan does not include sandbox-bridge access. Therefore this report does **not** claim a screenshot-based audit of Base44's actual screens, spacing, visual states, or interactions. The user's assessment that Base44 has the better UI/UX is treated as the target direction; exact visual details must not be invented.

## Verified content and implementation inventory

- One non-demo Base44 abdominal dataset record references 320 unique axial PNG URLs from Wikimedia Commons. It declares 3 mm slice thickness, `available_planes: ["axial"]`, no segmentation, and CC0 1.0. Source verification also established that the same Commons gallery has distinct 150-image coronal and 178-image sagittal categories; those extra stacks were added to GitHub separately rather than attributed to Base44's database record.
- A separate Base44 record contains liver polygons, but the user has confirmed those annotations are not a priority. They are excluded from this migration.
- Three other anatomical-structure records are explicitly demo placeholders.
- Two stored clinical cases are explicit demo placeholders; neither has a source case URL, verified viewer URL, or licence.
- The `QuizQuestion` entity contains zero records.
- The schemas show potential content-management fields for anatomy, clinical cases, source URLs, attribution, licences, difficulty, learning objectives, and review status. Schema availability is not evidence that the related workflow is implemented.

## UX and visual assessment

| Area | Finding | Action |
|---|---|---|
| Base44 visual hierarchy and interaction quality | User identifies it as the preferred reference; screenshots/code are not available to this audit | Use as the design target, but do not claim a faithful visual clone yet |
| CT content discovery | A distinct 320-image series exists in Base44 | Add a separate catalog entry; do not mix its images with SPL volume coordinates |
| Image navigation | A sequential axial set can support index, previous/next, keyboard and slider navigation | Deliver a lightweight stack viewer with loading and failure states |
| Bilingual / responsive UX | GitHub already has Persian RTL and English LTR foundations | Preserve language support, responsive controls, focus states and clear labels |
| Medical-data trust | Base44's non-demo dataset is marked published, but geometry and structure annotation evidence is incomplete | Keep the new module explicitly marked as a source-image preview / review-required |
| Educational content | Stored clinical cases are placeholders and quiz collection is empty | Exclude them; do not import placeholder learning content |
| Privacy / third-party requests | Images will load from Wikimedia when the learner opens the separate viewer | Make the external source obvious and set no-referrer on image requests |

## Destination implementation QA (not Base44 visual evidence)

The GitHub implementation now exposes a bilingual preview hub and a separate image-stack viewer. Generated 390px browser smoke screenshots of the GitHub page were visually inspected after the first implementation: the selected plane's header now follows the active tab, and the mobile layout places the CT image before the tool row so more of the image is visible in the initial viewport. Cross-browser checks (Chromium, Firefox and WebKit) validate the viewer route, representative axial/coronal/sagittal navigation, and absence of horizontal overflow. These screenshots are evidence of the **GitHub destination implementation only**, not screenshots of the Base44 source app and not evidence of a faithful Base44 visual clone.

## What this audit does not establish

No visual-regression result, rendered UI capture, browser interaction trace, screen-reader assessment, independent image-quality review, or clinical validation of the Base44 app was performed. A later screenshot-driven pass is needed to port its exact design details and feature behaviors.