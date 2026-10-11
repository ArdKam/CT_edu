# CT Edu — guided-case authoring and review contract

This workflow is for authoring **educational case records**, not generating clinical ground truth. The checked-in template is intentionally a draft with empty teaching content and closed publication gates. Do not turn placeholders into public cases by changing a status string.

## Required authoring sequence

1. **Identify exact provenance.** Record source collection, release/version, exact asset/study identifier, license reference, required attribution, source URL, and whether the exact source and the intended derived web assets may be redistributed. A download agreement is not assumed to permit public hosting.
2. **Validate image integrity.** Preserve native resolution; verify series completeness, dimensions, plane orientation, physical geometry, slice ordering, intensity semantics/windowing and segmentation/annotation alignment. For radiographs, record PA/AP/lateral/unknown and do not infer projection from pixels.
3. **Document the educational target.** Add measurable objectives, a clinical question and only the context needed for the learning objective. Do not add patient names, IDs, MRNs, accession numbers, full dates of birth or other direct identifiers.
4. **Create guided steps.** Each step must specify its prompt in Persian and English and the response type. Learners should make their own findings before they are shown the reference explanation.
5. **Create an explicit rubric.** Define criteria, points, expected findings, accepted alternatives, key-finding location and a rationale for feedback. Do not treat source annotations as unquestioned truth.
6. **Obtain independent reviews.** Record medical/radiology review, technical image/geometry review and educational review, using a role, a non-sensitive reviewer reference and review date.
7. **Check privacy and publishability.** Review DICOM/NIfTI metadata and burned-in identifiers. Confirm de-identification and public-redistribution rights. Keep the case in draft or review-required state until every gate is evidenced.
8. **Validate before handoff.** Run:
   
   ~~~bash
   node scripts/validate_teaching_case.js cases/templates/teaching-case.template.json
   node --test tests/teaching-case-validator.test.cjs
   ~~~

   To check a fully reviewed candidate for publication readiness, add the option --require-publishable. This command checks the local record; it does not grant permission, attest that a reviewer is qualified, or validate anatomy by itself.

## Separation of teaching content and the public client

Do not package the answer key or a private reference interpretation inside a static case file intended for learners to download before they submit. The app is currently static/local-first and has no server-side answer-key protection. Until a backend is designed and reviewed, keep reference interpretations and scoring keys in the maintainer/reviewer authoring workflow, and publish only content explicitly approved for disclosure.

## Current state

The SPL normal-anatomy manifest has a stable case ID and records the exact source geometry, but orientation/segmentation teaching review and redistribution rights remain open. No radiology/pathology case is considered approved by this authoring template. It is intentionally an empty scaffold, not a sample patient case.
