(function (root, factory) {
  'use strict';
  const series = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = series;
  if (root) root.CTEduWikimediaImageSeries = series;
}(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  function fileUrl(filename) {
    const encoded = encodeURIComponent(filename).replace(/%20/g, '_').replace(/[!'()*]/g, function (char) {
      return '%' + char.charCodeAt(0).toString(16).toUpperCase();
    });
    return 'https://commons.wikimedia.org/wiki/Special:FilePath/' + encoded;
  }
  function numberedFiles(prefix, suffix, start, end, excluded) {
    const omissions = new Set(excluded || []);
    const files = [];
    for (let number = start; number <= end; number += 1) {
      if (!omissions.has(number)) files.push(fileUrl(prefix + number + suffix));
    }
    return files;
  }
  const axialImages = Object.freeze(numberedFiles('Computed tomography of human brain (', ').png', 1, 34));
  const planeImages = Object.freeze({
    axial:axialImages
  });
  const planeInfo = Object.freeze([
    Object.freeze({ id:'axial', labelEn:'Axial', labelFa:'محوری', count:axialImages.length,
      categoryUrl:'https://commons.wikimedia.org/wiki/Category:Computed_tomography_images_of_Mikael_Häggström%27s_brain' })
  ]);
  function getPlane(id) { return planeImages[id] || null; }
  const counts = Object.freeze({
    axial:axialImages.length
  });
  return Object.freeze({
    id: 'wikimedia-brain-contrast-case-2',
    title: 'Brain CT with intravenous contrast — axial image stack',
    description: 'An axial-only source-image preview of a contrast-enhanced brain CT. It is a separate stack and is not a volumetric dataset.',
    imageCount: axialImages.length,
    totalImageCount: axialImages.length,
    planeCounts: counts,
    sourceName: 'Scrollable computed tomography images of a normal brain (case 2)',
    sourceAuthor: 'Mikael Häggström, M.D.',
    sourceUrl: 'https://commons.wikimedia.org/wiki/Scrollable_computed_tomography_images_of_a_normal_brain_(case_2)',
    license: 'CC0 1.0 Universal Public Domain Dedication',
    licenseUrl: 'https://creativecommons.org/publicdomain/zero/1.0/',
    reportedSliceThicknessMm: null,
    inPlaneSpacingMm: null,
    geometryVerified: false,
    synchronizedVolume: false,
    segmentationAvailable: false,
    clinicalReviewStatus: 'review-required',
    listPlanes: function () { return planeInfo.map(function (plane) { return Object.assign({}, plane); }); },
    getPlaneInfo: function (id) { const plane = planeInfo.find(function (item) { return item.id === id; }); return plane ? Object.assign({}, plane) : null; },
    getImageUrl: function (zeroBasedIndex, plane) {
      const images = getPlane(plane || 'axial');
      return images && Number.isInteger(zeroBasedIndex) && zeroBasedIndex >= 0 && zeroBasedIndex < images.length ? images[zeroBasedIndex] : null;
    },
    listImageUrls: function (plane) { return (getPlane(plane || 'axial') || []).slice(); }
  });
}));
