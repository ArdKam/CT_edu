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

### CT head — RSNA Intracranial Hemorrhage Detection (candidate; current agreement must be reviewed)
- Official resources: [RSNA Medical Imaging Resource for AI (MIRA)](https://imaging.rsna.org/) and the [RSNA-IHD data card](https://atlas.rsna.org/cards/bd41bbe2-f161-4c19-841c-85d8b645e306).
- The current RSNA data card names the governing terms as the **RSNA MIRA Dataset Research Use Agreement**. MIRA describes its datasets as available at no cost for non-commercial research, but requires users to register and accept the applicable terms before download. Do not substitute an older 2019 challenge PDF for the agreement presented for the exact current dataset release.
- Potential use: a selected, expert-reviewed teaching set covering intracranial hemorrhage subtypes, with dataset labels kept separate from the learner-facing reference interpretation.
- **Redistribution gate:** the current agreement must explicitly permit the intended hosting, derived web-image generation, and public educational use before any source or derivative is put into this repository or the Pages artifact. Older RSNA challenge terms and mirrored registry descriptions are not fully consistent about sharing/re-distribution; this roadmap therefore does not assume redistribution is permitted. If the current agreement is ambiguous, obtain written clarification from RSNA and do not integrate the files meanwhile.
- Research citation: Flanders et al., *Radiology: Artificial Intelligence* (2020), [DOI 10.1148/ryai.2020190211](https://doi.org/10.1148/ryai.2020190211).
- Decision: candidate for a free, non-commercial teaching module only after current terms review, permitted-use confirmation, selected-case validation, and neuroradiologist review; **not approved for integration or redistribution yet**.

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
- Versions 1.0.0, 1.2.0 and 1.3.0 list CC BY 4.0, but their version pages state that the files are no longer available. The latest version 1.3.1 is under the PhysioNet Restricted Health Data License and Data Use Agreement.
- Current restricted version: [CT-ICH v1.3.1](https://physionet.org/content/ct-ich/1.3.1/) and [license](https://physionet.org/content/ct-ich/view-license/1.3.1/).
- **Do not use restricted v1.3.1 in a public web app or redistribute it.** The old version pages are not a viable current source while their files remain unavailable. For the first head-case source, prioritize the RSNA-IHD candidate for a free non-commercial education release, or find another currently downloadable dataset whose exact license permits the planned public use.

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


## Multi-modality expansion status — 2026-10-11

The product now has a code-level modality catalog. This does not change the approved data scope: abdominal CT remains the only data-backed viewer in the current prototype. Brain CT, chest CT, and chest radiography remain gated until source rights, geometry, teaching labels, and specialist review are complete.

### Brain CT — separate normal anatomy and pathology
- The [SPL Head and Neck Atlas](https://www.openanatomy.org/atlas-pages/atlas-spl-head-and-neck.html) is a candidate for head/neck CT anatomy: reduced-resolution 256×256 CT with label maps under 3D Slicer License Part B. Its scope emphasizes skull, mandible, upper ribs/spine, and neck structures; **do not present it as a full brain-parenchyma or hemorrhage teaching set**.
- For pathology curriculum and access review, see [RSNA-IHD in the RSNA ATLAS data card](https://atlas.rsna.org/cards/bd41bbe2-f161-4c19-841c-85d8b645e306) / [MIRA](https://mira.rsna.org/dataset/1).
- The current data card identifies the RSNA MIRA Dataset Research Use Agreement. Do not assume that permission to download or use the data for non-commercial research/education also permits hosting DICOMs or derived images on a public website. Obtain a clear permitted-use decision for the exact release or select a source with suitable redistribution rights.
- Future scope may include normal anatomy, ventricles/midline, acute hemorrhage patterns, mass effect, and hydrocephalus. These lessons require neuroradiology/anatomy review and are not complete yet.

### Chest CT — separate anatomy and pathology sources
- The [Mauritanian Anatomy Laboratory Thoracic Atlas](https://www.openanatomy.org/atlas-pages/atlas-mauritania-thorax.html) is a candidate for annotated thoracic anatomy. It derives from a high-quality CT with segmentation and cites 3D Slicer License Part B; exact package contents and third-party terms still need review.
- For pulmonary-nodule pathology, the [official LIDC-IDRI collection page](https://www.cancerimagingarchive.net/collection/lidc-idri/) lists CC BY 3.0 for collection image resources and describes a large DICOM collection.
- Do not copy the whole collection into the Pages bundle. Select a few complete, suitable CT series; retain source geometry; record required attribution and identifiers; review orientation, series completeness, annotations and quality; verify the exact files being redistributed before publishing derivatives.
- Multi-reader pulmonary nodule annotations should be presented as reader assessments rather than a single unquestioned ground truth.

### Chest radiography — local viewer implemented; curate public cases separately
- A browser-only 2D viewer handles local PNG/JPEG/WebP files with pan/zoom/fit, projection metadata, a 25 MB cap, and no upload. It does not parse DICOM, infer projection or provide diagnosis.
- The [official NIH Chest X-ray page](https://docs.cloud.google.com/healthcare-api/docs/resources/public-datasets/nih-chest) states use of NIH Clinical Center images has no restrictions but requires attribution, a link to the original download and a CVPR 2017 citation. NIH ChestX-ray is the leading candidate for a small curated public teaching subset; verify image identifiers, attribution and educational labels before bundling.
- [VinDr-CXR on PhysioNet](https://physionet.org/content/vindr-cxr/1.0.0/) requires credentialed access, training and a Data Use Agreement. Do **not** redistribute VinDr-CXR under its current terms.
- Curated lessons must preserve resolution and specify PA/AP/lateral projection with expert-reviewed interpretations. The local viewer is not a substitute for those cases.

### Per-modality release gate
1. Record exact source/version and confirm permission for the intended public hosting and derivatives.
2. Validate completeness and quality; remove patient-identifying metadata and burned-in identifiers from public derivatives.
3. CT: verify series geometry, patient orientation, slice spacing and intensity/window semantics. CXR: preserve source resolution and record projection/display transform.
4. Obtain expert review of anatomy/findings, annotations, and feedback. Do not present ambiguous source labels as ground truth.
5. Test representative browsers/devices and performance; load only what is required and avoid oversized raw archives in the source repository.
6. Change a catalog state to available only after all relevant gates pass.
