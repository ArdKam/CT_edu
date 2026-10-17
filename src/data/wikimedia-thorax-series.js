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
  const axialImages = Object.freeze(numberedFiles('High-resolution computed tomograph of a normal thorax, axial plane (', ').jpg', 1, 118, [71, 73, 84, 87, 89, 91, 96, 99, 104, 106, 111, 114]).map(function (url) { return url; }));
  const coronalImages = Object.freeze(numberedFiles('High-resolution computed tomograph of a normal thorax, coronal plane (', ').jpg', 1, 67).map(function (url) { return url; }));
  const sagittalImages = Object.freeze(numberedFiles('High-resolution computed tomograph of a normal thorax, sagittal plane (', ').jpg', 3, 95).map(function (url) { return url; }));
  const planeImages = Object.freeze({
    axial:axialImages,
    coronal:coronalImages,
    sagittal:sagittalImages
  });
  const planeInfo = Object.freeze([
    Object.freeze({ id:'axial', labelEn:'Axial', labelFa:'محوری', count:axialImages.length,
      categoryUrl:'https://commons.wikimedia.org/wiki/Category:High-resolution_computed_tomography_images_of_normal_thorax' }),
    Object.freeze({ id:'coronal', labelEn:'Coronal', labelFa:'کرونال', count:coronalImages.length,
      categoryUrl:'https://commons.wikimedia.org/wiki/Category:High-resolution_computed_tomography_images_of_normal_thorax' }),
    Object.freeze({ id:'sagittal', labelEn:'Sagittal', labelFa:'ساژیتال', count:sagittalImages.length,
      categoryUrl:'https://commons.wikimedia.org/wiki/Category:High-resolution_computed_tomography_images_of_normal_thorax' })
  ]);
  function getPlane(id) { return planeImages[id] || null; }
  const counts = Object.freeze({
    axial:axialImages.length,
    coronal:coronalImages.length,
    sagittal:sagittalImages.length
  });
  return Object.freeze({
    id: 'wikimedia-normal-thorax',
    title: 'Normal thorax — three independent CT image stacks',
    description: 'High-resolution CT images of a normal thorax in three independent planes. This is a source-image preview, not a geometry-verified volume.',
    imageCount: axialImages.length,
    totalImageCount: axialImages.length + coronalImages.length + sagittalImages.length,
    planeCounts: counts,
    sourceName: 'Scrollable high-resolution computed tomography images of a normal thorax',
    sourceAuthor: 'Mikael Häggström, M.D.',
    sourceUrl: 'https://commons.wikimedia.org/wiki/Scrollable_high-resolution_computed_tomography_images_of_a_normal_thorax',
    license: 'CC0 1.0 Universal Public Domain Dedication',
    licenseUrl: 'https://creativecommons.org/publicdomain/zero/1.0/',
    reportedSliceThicknessMm: 3,
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
