# Radiopaedia abdominal CT case intake and verification log

**Intake date:** 2026-10-14  
**Scope:** metadata and links only; no Radiopaedia images, thumbnails, article passages or viewer assets are copied into CT Edu.  
**Status:** `partially_verified` for all records in this intake. This is a candidate teaching library, not a medically or legally approved case set.

## Summary

| Primary category | Existing cases retained | New records | Total |
|---|---:|---:|---:|
| Gastrointestinal | 4 | 10 | 14 |
| Hepatobiliary & pancreas | 0 | 11 | 11 |
| Renal & urinary | 0 | 7 | 7 |
| Adrenal & endocrine | 0 | 3 | 3 |
| Female reproductive & pelvis | 0 | 4 | 4 |
| Male genitourinary | 0 | 3 | 3 |
| Peritoneum, retroperitoneum & vessels | 0 | 7 | 7 |
| **Total** | **4** | **45** | **49** |

The new 45 records are additional candidates discovered through targeted organ-system searches. They are not the result of an exhaustive survey of Radiopaedia. The requested ceiling of 20 cases per category is a maximum, not an instruction to pad categories. Current overall catalogue counts remain below 20 in each system: gastrointestinal 14 (6 below 20), hepatobiliary/pancreas 11 (9 below), renal/urinary 7 (13 below), adrenal/endocrine 3 (17 below), female reproductive/pelvic 4 (16 below), male genitourinary 3 (17 below), and peritoneal/retroperitoneal/vascular 7 (13 below). These are candidate counts, not fully verified counts. Since live CT images/viewers could not be checked, the strict live-verification count is 0 in every category and the verification shortfall remains unresolved.

## Selection order and interpretation of status

`searchOrder` in the data is 1-based within the category-specific intake pass, in the order shown in the table below. The passes used targeted Radiopaedia case-title and modality searches for gastrointestinal, hepatobiliary/pancreatic, renal/urinary, adrenal, female pelvic, male genitourinary and peritoneal/vascular CT. The order is a reproducible record of this intake, not a claim that Radiopaedia search results are stable over time or that all cases were reviewed.

Status values:
- `verified`: source page, actual CT images, intended direct viewer and image loading were individually checked.
- `partially_verified`: some metadata or CT modality evidence was found, but one or more required live checks remains open.
- `unavailable`: the case or required images/viewer could not be accessed.
- `excluded`: unsuitable for this CT collection, with a reason recorded.

**No added case is marked `verified`.** The browsing interface could not open Radiopaedia's live case pages in this run. The case metadata and CT descriptions were available through indexed case content, but this is not equivalent to opening the original page or seeing the images load. The actual live-image verification count for this change is therefore **0**. All added cases retain a separate `sourcePage`, `ctImages`, `directViewer`, `imagesLoaded`, `categorization`, and `attributionAndRights` check in the case record. Do not upgrade a status merely because a URL is syntactically valid.

## New case audit

All source-page links use numeric Radiopaedia case permalinks. The UI shows non-diagnostic learning labels and does not search source titles, citations, case IDs or URLs before report submission. Source titles, related articles and citations stay hidden until submission under the existing learner workflow.

| # in category | System | Internal ID | Radiopaedia source case | Direct study viewer | Status and key limitation |
|---:|---|---|---|---|---|
| 1 | Gastrointestinal | `abd-gi-001` | [Case 198206](https://radiopaedia.org/cases/198206?lang=us) | Not extracted | `partially_verified` — indexed CT description; live series not checked |
| 2 | Gastrointestinal | `abd-gi-002` | [Case 74870](https://radiopaedia.org/cases/74870?lang=us) | Not extracted | `partially_verified` — indexed axial/coronal/sagittal CT stack description; no live image check |
| 3 | Gastrointestinal | `abd-gi-003` | [Case 25921](https://radiopaedia.org/cases/25921?lang=us) | Not extracted | `partially_verified` — CT mentioned in indexed content; live page not checked |
| 4 | Gastrointestinal | `abd-gi-004` | [Case 99249](https://radiopaedia.org/cases/99249?lang=us) | [Study 120709](https://radiopaedia.org/cases/99249/studies/120709?lang=us) | `partially_verified` — CT study ID found in indexed metadata; URL/image load not live-tested. Study 120710 was described as radiography and was not used |
| 5 | Gastrointestinal | `abd-gi-005` | [Case 177978](https://radiopaedia.org/cases/177978?lang=us) | Not extracted | `partially_verified` — case has CT material in indexed content; live stack not checked |
| 6 | Gastrointestinal | `abd-gi-006` | [Case 83859](https://radiopaedia.org/cases/83859?lang=us) | Not extracted | `partially_verified` — indexed case states CT abdomen/pelvis with IV/oral contrast and a portal-venous CT stack; live viewer not checked |
| 7 | Gastrointestinal | `abd-gi-007` | [Case 31252](https://radiopaedia.org/cases/31252?lang=us) | Not extracted | `partially_verified` — contrast-enhanced CT and coronal reconstruction described; images not live-loaded |
| 8 | Gastrointestinal | `abd-gi-008` | [Case 40732](https://radiopaedia.org/cases/40732?lang=us) | Not extracted | `partially_verified` — CT abdomen/pelvis with non-contrast and portal-venous axial/coronal/sagittal stacks in indexed content; direct viewer not extracted |
| 9 | Gastrointestinal | `abd-gi-009` | [Case 148532](https://radiopaedia.org/cases/148532?lang=us) | Not extracted | `partially_verified` — indexed CT section describes two transition points and mesenteric rotation; live image loading not checked |
| 10 | Gastrointestinal | `abd-gi-010` | [Case 61116](https://radiopaedia.org/cases/61116?lang=us) | Not extracted | `partially_verified` — urgent contrast CT stacks in axial, coronal and sagittal planes are described; live viewer/image loading not checked |
| 1 | Hepatobiliary & pancreas | `abd-hbp-001` | [Case 11083](https://radiopaedia.org/cases/11083?lang=us) | Not extracted | `partially_verified` — CT identified in indexed content; images not loaded |
| 2 | Hepatobiliary & pancreas | `abd-hbp-002` | [Case 164871](https://radiopaedia.org/cases/164871?lang=us) | [Study 134067](https://radiopaedia.org/cases/164871/studies/134067?lang=us) | `partially_verified` — study ID found in indexed metadata; live viewer/image load not tested |
| 3 | Hepatobiliary & pancreas | `abd-hbp-003` | [Case 47865](https://radiopaedia.org/cases/47865?lang=us) | Not extracted | `partially_verified` — CT at presentation/follow-up described; images not loaded |
| 4 | Hepatobiliary & pancreas | `abd-hbp-004` | [Case 171645](https://radiopaedia.org/cases/171645?lang=us) | Not extracted | `partially_verified` — indexed case describes CT follow-up; live stack not checked |
| 5 | Hepatobiliary & pancreas | `abd-hbp-005` | [Case 35234](https://radiopaedia.org/cases/35234?lang=us) | [Study 36772](https://radiopaedia.org/cases/35234/studies/36772?lang=us) | `partially_verified` — indexed Radiopaedia case identifies CT abdomen and study 36772; live viewer/image loading not re-tested |
| 6 | Hepatobiliary & pancreas | `abd-hbp-006` | [Case 152397](https://radiopaedia.org/cases/152397?lang=us) | Not extracted | `partially_verified` — CT with arterial enhancement and delayed washout described; live viewer not checked |
| 7 | Hepatobiliary & pancreas | `abd-hbp-007` | [Case 9940](https://radiopaedia.org/cases/9940?lang=us) | Not extracted | `partially_verified` — post-TACE portal-venous axial/coronal CT stacks described; pre-treatment CT was unavailable |
| 8 | Hepatobiliary & pancreas | `abd-hbp-008` | [Case 172109](https://radiopaedia.org/cases/172109?lang=us) | Not extracted | `partially_verified` — arterial and portal-venous CT abdomen/pelvis described; live viewer not checked |
| 9 | Hepatobiliary & pancreas | `abd-hbp-009` | [Case 227574](https://radiopaedia.org/cases/227574?lang=us) | Not extracted | `partially_verified` — case page indexed with CT stack; images not live-loaded |
| 10 | Hepatobiliary & pancreas | `abd-hbp-010` | [Case 157852](https://radiopaedia.org/cases/157852?lang=us) | Not extracted | `partially_verified` — CT-specific cholecystitis findings discussed alongside ultrasound; live viewer not checked |
| 11 | Hepatobiliary & pancreas | `abd-hbp-011` | [Case 50146](https://radiopaedia.org/cases/50146?lang=us) | Not extracted | `partially_verified` — CT describes regional hepatic attenuation difference with portal/SMV thrombosis; live images not checked |
| 1 | Renal & urinary | `abd-ru-001` | [Case 191505](https://radiopaedia.org/cases/191505?lang=us) | Not extracted | `partially_verified` — CT identified in indexed content; no live image check |
| 2 | Renal & urinary | `abd-ru-002` | [Case 79763](https://radiopaedia.org/cases/79763?lang=us) | Not extracted | `partially_verified` — CT described; direct study ID not extracted |
| 3 | Renal & urinary | `abd-ru-003` | [Case 151692](https://radiopaedia.org/cases/151692?lang=us) | Not extracted | `partially_verified` — CT described in indexed page; images not loaded |
| 4 | Renal & urinary | `abd-ru-004` | [Case 99963](https://radiopaedia.org/cases/99963?lang=us) | Not extracted | `partially_verified` — multiphase CT described; live examination not checked |
| 5 | Renal & urinary | `abd-ru-005` | [Case 240187](https://radiopaedia.org/cases/240187?lang=us) | Not extracted | `partially_verified` — CT urography describes obstructing ureteric stone and delayed nephrogram; live images not checked |
| 6 | Renal & urinary | `abd-ru-006` | [Case 147046](https://radiopaedia.org/cases/147046?lang=us) | Not extracted | `partially_verified` — non-contrast MDCT with ureteric calculus and upstream hydroureteronephrosis described; live viewer not checked |
| 7 | Renal & urinary | `abd-ru-007` | [Case 147902](https://radiopaedia.org/cases/147902?lang=us) | Not extracted | `partially_verified` — CT with renal enlargement, obstructing calculi and perinephric change described; live image loading not checked |
| 1 | Adrenal & endocrine | `abd-ae-001` | [Case 83258](https://radiopaedia.org/cases/83258?lang=us) | Not extracted | `partially_verified` — CT described in indexed content; no live image check |
| 2 | Adrenal & endocrine | `abd-ae-002` | [Case 33078](https://radiopaedia.org/cases/33078?lang=us) | Not extracted | `partially_verified` — non-contrast/arterial/delayed CT described; viewer not opened |
| 3 | Adrenal & endocrine | `abd-ae-003` | [Case 87281](https://radiopaedia.org/cases/87281?lang=us) | Not extracted | `partially_verified` — non-contrast, arterial, portal-venous, delayed and sagittal CT stacks described; live images not checked |
| 1 | Female reproductive & pelvis | `abd-frp-001` | [Case 9862](https://radiopaedia.org/cases/9862?lang=us) | Not extracted | `partially_verified` — CT attenuation described; no live image check |
| 2 | Female reproductive & pelvis | `abd-frp-002` | [Case 232293](https://radiopaedia.org/cases/232293?lang=us) | Not extracted | `partially_verified` — sagittal portal-venous CT described; live stack not checked |
| 3 | Female reproductive & pelvis | `abd-frp-003` | [Case 50469](https://radiopaedia.org/cases/50469?lang=us) | Not extracted | `partially_verified` — case discussion describes CT signs in surgically proven torsion; CT study was not live-opened |
| 4 | Female reproductive & pelvis | `abd-frp-004` | [Case 98221](https://radiopaedia.org/cases/98221?lang=us) | Not extracted | `partially_verified` — contrast-enhanced CT abdomen/pelvis with fat/debris ovarian lesion described; live image loading not checked |
| 1 | Male genitourinary | `abd-mgu-001` | [Case 191413](https://radiopaedia.org/cases/191413?lang=us) | Not extracted | `partially_verified` — both CT and MRI are described; CT cannot settle every ductal relationship |
| 2 | Male genitourinary | `abd-mgu-002` | [Case 77724](https://radiopaedia.org/cases/77724?lang=us) | Not extracted | `partially_verified` — CT bone-window images described; live viewer not checked |
| 3 | Male genitourinary | `abd-mgu-003` | [Case 87645](https://radiopaedia.org/cases/87645?lang=us) | Not extracted | `partially_verified` — unenhanced axial/coronal CT and MPR described; source diagnosis is probable, not pathology-proven |
| 1 | Peritoneum, retroperitoneum & vessels | `abd-prv-001` | [Case 7627](https://radiopaedia.org/cases/7627?lang=us) | Not extracted | `partially_verified` — CT shows peritoneal disease/ascites in indexed content; primary ovary was not directly seen in that description |
| 2 | Peritoneum, retroperitoneum & vessels | `abd-prv-002` | [Case 221525](https://radiopaedia.org/cases/221525?lang=us) | Not extracted | `partially_verified` — CT aneurysm/thrombus description; live viewer not checked |
| 3 | Peritoneum, retroperitoneum & vessels | `abd-prv-003` | [Case 54671](https://radiopaedia.org/cases/54671?lang=us) | Not extracted | `partially_verified` — CT urography and delayed contrast extravasation/urinoma described; live viewer not checked |
| 4 | Peritoneum, retroperitoneum & vessels | `abd-prv-004` | [Case 239658](https://radiopaedia.org/cases/239658?lang=us) | Not extracted | `partially_verified` — indexed CT discussion describes superior mesenteric vein thrombosis; source study page not live-opened |
| 5 | Peritoneum, retroperitoneum & vessels | `abd-prv-005` | [Case 55326](https://radiopaedia.org/cases/55326?lang=us) | Not extracted | `partially_verified` — indexed case discussion describes mesenteric venous thrombosis with small-bowel ischaemia; live viewer not checked |
| 6 | Peritoneum, retroperitoneum & vessels | `abd-prv-006` | [Case 28571](https://radiopaedia.org/cases/28571?lang=us) | Not extracted | `partially_verified` — initial/delayed CT stacks after blunt trauma are indexed; live images not checked |
| 7 | Peritoneum, retroperitoneum & vessels | `abd-prv-007` | [Case 59801](https://radiopaedia.org/cases/59801?lang=us) | Not extracted | `partially_verified` — CT stack described for bowel obstruction secondary to peritoneal disease; live viewer not checked |

## Preserved records

| Internal ID | Original case link | Direct viewer link | Outcome |
|---|---|---|---|
| `acute-abdominal-pain-ct` | [Closed-loop small bowel obstruction](https://radiopaedia.org/cases/closed-loop-small-bowel-obstruction-5?lang=us) | Not stored | Preserved; `partially_verified` |
| `closed-loop-pattern-ct` | [Closed-loop small bowel obstruction](https://radiopaedia.org/cases/closed-loop-small-bowel-obstruction-4?lang=us) | Not stored | Preserved; `partially_verified` |
| `bowel-viability-ct` | [Closed-loop obstruction due to adhesive band](https://radiopaedia.org/cases/closed-loop-obstruction-due-to-adhesive-band-resulting-in-small-bowel-ischemia-and-resection?lang=us) | Not stored | Preserved; `partially_verified` |
| `ascending-colon-lipoma-ct` | [Ascending colon lipoma](https://radiopaedia.org/cases/ascending-colon-lipoma?lang=us) | [Existing study link](https://radiopaedia.org/cases/2582/studies/6276?lang=us#t=im&v1i=478&v1z=1&v2i=931&v2z=1) | Preserved; previously documented as the working example, but not re-tested in this change |

Direct viewer links are stored for **four** cases in the combined library. Three were added in this intake and one was already present. **Zero** direct viewer URLs were successfully live-opened and image-load-checked by this change. URL construction is based on identifiers found in indexed source metadata; it is not a report that the URL works.

## Excluded candidates

The intake intentionally excluded modality-mismatched candidates from this CT-only guided collection:
- **Polycystic ovarian morphology** — ultrasound-only material identified; no CT case was established.
- **Early intrauterine pregnancy and haemorrhagic corpus luteum** — ultrasound is the relevant examination for the described findings; no suitable CT series was established.
- **Endometriosis — haematosalpinx and kissing ovaries** — MRI-based description; not used as CT evidence.
- **Ovarian dermoid cyst with Rokitansky nodule** — MRI-only candidate; kept distinct from Case 9862, for which CT findings were identified.
- Other search results that did not establish an actual CT examination or a suitable CT stack were not admitted. Their URLs were not retained in this intake, so no fabricated references are listed here.

No case was duplicated across systems. Cross-system anatomy is represented as secondary tags; each record has exactly one primary category. Category-level counts in this file describe the current intake, not the number of all suitable Radiopaedia cases.

## Case schema and viewer behavior

Each record has a stable internal `id`, bilingual neutral catalogue title/summary, `category`, `tags`, CT `modality`, `source.url`, source citation, and a `verification` object. The `level` is an editorial CT Edu learning-path assignment, not a Radiopaedia-supplied difficulty rating. When an actual study identifier was found, `source.viewerUrl` stores the direct Radiopaedia study URL; the source page remains the canonical fallback. The embedded request still starts only after a user clicks the existing load button. The visible **Open viewer in new tab** link appears only when a direct URL is stored. A blocked or blank iframe is not treated as a successful image load.

Before report submission, the UI does not display the source diagnosis, source title, citation or related-article title. Catalogue filtering deliberately searches neutral titles, summaries, organ-system labels and general anatomical tags—not source diagnosis, citation, source IDs or URLs. This does not make the exercise a fully blinded examination: opening the external Radiopaedia source may reveal its diagnosis.

## Attribution, rights and educational review

Radiopaedia remains the image host and source of record. CT Edu does not download, mirror, cache or bundle images; it stores links, identifiers discovered in case metadata, and CT Edu-authored teaching prompts. Source attribution is retained. Do not copy source text or images into the repository or change a record to `verified` without confirming the actual image stack and applicable item terms. The existence of an accessible URL is not a licence grant. Review current Radiopaedia terms and exact item/third-party rights before public release or any image reuse.

Every case remains an educational candidate, not a reviewed clinical reference interpretation. Independent radiologist/anatomy-educator review of the actual CT series, source-rights review, accessibility and physical-device testing, and legal/privacy review remain release gates. The deployment approval latch must remain unchanged.
