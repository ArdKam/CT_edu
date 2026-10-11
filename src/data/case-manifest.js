(function (root, factory) {
  'use strict';
  const manifest = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = manifest;
  if (root) root.CTEduCaseManifest = manifest;
}(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const cases = [
    Object.freeze({
      id: 'spl-abdomen-normal-atlas',
      version: 1,
      region: 'abdomen',
      modality: 'CT',
      learningMode: 'normal-anatomy',
      status: 'available-prototype',
      titleFa: 'آناتومی طبیعی شکم · اطلس SPL',
      titleEn: 'Normal abdominal anatomy · SPL Atlas',
      source: Object.freeze({
        id: 'spl-abdominal-atlas-2015',
        name: 'SPL Abdominal Atlas',
        url: 'https://www.openanatomy.org/atlas-pages/atlas-spl-abdomen.html',
        licenseReference: '3D Slicer License Part B',
        redistributionStatus: 'review-required'
      }),
      volume: Object.freeze({
        dimensions: Object.freeze({ i: 256, j: 256, k: 113 }),
        spacingMm: Object.freeze({ i: 0.9375, j: 0.9375, k: 1.5 }),
        originLpsMm: Object.freeze({ x: -119.53, y: 119.53, z: 84 }),
        availablePlanes: Object.freeze({
          axial: Object.freeze({ indexAxis: 'k', sliceCount: 113, defaultIndex: 26 }),
          coronal: Object.freeze({ indexAxis: 'j', sliceCount: 256, defaultIndex: 128 }),
          sagittal: Object.freeze({ indexAxis: 'i', sliceCount: 256, defaultIndex: 128 })
        }),
        intensitySemantics: 'source-stored-intensities; HU calibration not independently verified'
      }),
      review: Object.freeze({
        orientation: 'expert-review-required',
        segmentationAlignment: 'expert-review-required',
        educationalContent: 'expert-review-required',
        redistributionRights: 'legal-review-required',
        publicReleaseApproved: false
      }),
      privacy: Object.freeze({ patientDataExpected: false, userUploadsAccepted: false })
    })
  ];
  const byId = Object.create(null);
  cases.forEach(function (entry) { byId[entry.id] = entry; });
  return Object.freeze({
    schemaVersion: 1,
    list: function () { return cases.slice(); },
    getById: function (id) { return byId[id] || null; },
    isPublicReleaseApproved: function (id) {
      const entry = byId[id];
      return Boolean(entry && entry.review.publicReleaseApproved === true);
    }
  });
}));
