# Dataset selection roadmap — CT Edu

Status reviewed: 2026-10-11
Purpose: identify candidate sources for a public educational CT web app. **No candidate below is approved for production integration yet.** This is a source-selection record, not legal advice and not proof that derivative images can be redistributed.

## Current dataset

### SPL Abdominal Atlas — current normal-anatomy module
- Current source files: `Data/I.nrrd` and `Data/seg.nrrd` from the six uploaded archive parts.
- Current source volume: 256 × 256 × 113 voxels; approximately 0.9375 mm in-plane and 1.5 mm between axial slices.
- Purpose: normal abdominal cross-sectional anatomy and segment-overlay learning. It is **not** a curated pathology-case library.
- Rights gate: inspect the exact package license and third-party notices. The notice in the repository references 3D Slicer License Part B; that must not be treated as blanket clearance for every included third-party asset. The original ZIP files are still publicly accessible from the repository, even though the Pages build omits them.
- Source record: [Open Anatomy — SPL abdominal atlas](https://www.openanatomy.org/atlas-pages/atlas-spl-abdomen.html); [3D Slicer license notice](https://openanatomy.org/atlas-pages/slicer-license.html).

## Candidates for additional regions

### CT head — RSNA Intracranial Hemorrhage Detection (candidate; terms are non-commercial)
- Official resource: [RSNA Medical Imaging Resource for AI (MIRA)](https://imaging.rsna.org/).
- RSNA describes more than 25,000 brain CT studies, with 874,035 images and annotations for the major intracranial hemorrhage subtypes. The published terms permit academic research, education, and other non-commercial use only; redistribution requires attribution under those terms.
- Potential use: a selected, expert-reviewed teaching set covering extra-axial and intraparenchymal hemorrhage, with diagnostic labels separated from the learner-facing explanation.
- Constraints: do not treat the dataset as unrestricted/CC-BY; follow the exact [RSNA terms and attribution requirements](https://www.rsna.org/-/media/files/rsna/education/ai-resources-and-training/ai-image-challenge/rsna_ich_ai_challenge_2019_terms_of_use_and_attribution_final.pdf). It is not suitable for a monetized product unless a separate license permits that use. The full dataset is far too large to put in this repository or the Pages artifact.
- Research citation: Flanders et al., *Radiology: Artificial Intelligence* (2020), [DOI 10.1148/ryai.2020190211](https://doi.org/10.1148/ryai.2020190211).
- Decision: promising for a free, non-commercial educational release after terms review, selected-case validation, and radiologist review; not approved yet.

### CT chest — LIDC-IDRI (candidate; CC BY 3.0, large collection)
- Official resource: [TCIA LIDC-IDRI collection](https://www.cancerimagingarchive.net/collection/lidc-idri/).
- TCIA lists 1,010 subjects, approximately 133 GB of CT/DICOM data, radiologist nodule annotations, and CC BY 3.0 for the collection resources.
- Potential use: selected lung-nodule cases and multi-reader annotation teaching. The annotations should be explained as reader assessments, not an automatic single ground-truth diagnosis.
- Constraints: full data cannot be copied to GitHub Pages; choose individual studies, verify every series/protocol and attribution, and recheck any third-party files. This is not a ready-made chest emergency curriculum.
- Required collection attribution and DOI: [TCIA usage and citation details](https://wiki.cancerimagingarchive.net/pages/viewpage.action?pageId=1966254).
- Decision: suitable candidate for a separately reviewed chest nodule module; not approved for integration yet.

### Abdomen / multi-organ — CT-ORG (candidate; CC BY 3.0, large collection)
- Official resource: [TCIA CT-ORG collection](https://www.cancerimagingarchive.net/collection/ct-org/).
- TCIA lists 140 CT volumes and segmentations (about 16.9 GB total), NIfTI volumes with stored values in HU, and CC BY 3.0.
- Potential use: additional multi-organ anatomy and segmentation cases, or selected case studies where the acquisition and labels fit the lesson.
- Constraints: this is not a drop-in replacement for the SPL atlas. Acquisition/protocols and pathology vary; TCIA notes that some volumes may be left-right flipped. Each case needs orientation, labels, windowing, provenance, and educational review. Confirm the current TCIA data-use policy and exact attribution before redistributing derivatives.
- Decision: potential future source, not approved for integration yet.

### Alternate head CT source — PhysioNet CT-ICH
- Older version pages list CC BY 4.0, but the earlier version 1.0.0 is no longer downloadable. The current version 1.3.1 is under the PhysioNet Restricted Health Data License and Data Use Agreement.
- Current restricted version: [CT-ICH v1.3.1](https://physionet.org/content/ct-ich/1.3.1/) and [license](https://physionet.org/content/ct-ich/view-license/1.3.1/).
- Do **not** use restricted v1.3.1 in a public web app or redistribute it. Reconsider an older release only after verifying that the exact files remain available and that the exact license permits the proposed redistribution; the old version pages alone are not evidence that the files are currently available.

## Recommended data architecture

Keep the teaching mode and the data source separate:
1. **Normal-anatomy atlas** — known geometry, authoritative segmentation identifiers, anatomical labels.
2. **Clinical teaching case** — a complete study or approved derived stack, clinical context, findings, reference impression, differential, per-slice/region annotations, rubric, reviewer and source/license.
3. **Assessment** — learner response and rubric-based scoring, never embedded in the public case answer key before submission.

For each candidate case, store at minimum:
- immutable case ID and version;
- anatomy region, modality, protocol, and contrast status;
- volume dimensions, orientation, spacing, window presets and intensity semantics;
- source collection, exact release, license, mandatory attribution and any redistribution constraints;
- anonymization/metadata review status;
- reference interpretation and evidence/annotations;
- reviewer identity/role, review date and approval status;
- educational objectives and scoring rubric version.

## Integration and publication gates

- [ ] Record the exact license and terms for the exact data version.
- [ ] Verify whether redistribution of the original files **and** derived web images/labelmaps is allowed.
- [ ] Select a small representative study per region; do not download or ship entire multi-gigabyte archives by default.
- [ ] Verify DICOM/NIfTI geometry, orientation, intensity semantics, and slice order against a trusted viewer.
- [ ] Review every selected case and its annotations with a radiologist/anatomy educator.
- [ ] Remove or inspect identifying metadata and all image-burned identifiers before any public release.
- [ ] Package only the selected, legally distributable assets; include attribution/license notices and a provenance record.
- [ ] Add regression tests for plane orientation, CT/annotation alignment, missing/corrupt slices, and published endpoints.
- [ ] Keep unapproved cases out of the published catalogue.

## Recommended next data milestone

Before claiming a multi-region clinical MVP, assemble a **small candidate bundle** consisting of:
- the existing SPL abdominal anatomy lesson (after rights review);
- several reviewed head CT cases with hemorrhage labels from a source whose exact terms permit the intended public educational use;
- several reviewed chest CT cases with readable complete series and expert-reviewed annotations;
- a versioned case manifest and acceptance checklist.

The current source repositories are research datasets, not ready-made lessons. Do not expose their raw labels as the educational answer without checking what the labels mean and reviewing them against the source images.
