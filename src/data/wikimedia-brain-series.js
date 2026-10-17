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
  const axialImages = Object.freeze(numberedFiles('CT of a normal brain, axial ', '.png', 1, 41));
  const coronalImages = Object.freeze(numberedFiles('CT of a normal brain, coronal ', '.png', 1, 58));
  const sagittalImages = Object.freeze(numberedFiles('CT of a normal brain, sagittal ', '.png', 1, 40));
  const planeImages = Object.freeze({
    axial:axialImages,
    coronal:coronalImages,
    sagittal:sagittalImages
  });
  const planeInfo = Object.freeze([
    Object.freeze({ id:'axial', labelEn:'Axial', labelFa:'محوری', count:axialImages.length,
      categoryUrl:'https://commons.wikimedia.org/wiki/Category:Computed_tomography_of_normal_brain_in_axial_plane_(case_1)' }),
    Object.freeze({ id:'coronal', labelEn:'Coronal', labelFa:'کرونال', count:coronalImages.length,
      categoryUrl:'https://commons.wikimedia.org/wiki/Category:Computed_tomography_of_normal_brain_in_coronal_plane_(case_1)' }),
    Object.freeze({ id:'sagittal', labelEn:'Sagittal', labelFa:'ساژیتال', count:sagittalImages.length,
      categoryUrl:'https://commons.wikimedia.org/wiki/Category:Computed_tomography_of_normal_brain_in_sagittal_plane_(case_1)' })
  ]);
  function getPlane(id) { return planeImages[id] || null; }
  const counts = Object.freeze({
    axial:axialImages.length,
    coronal:coronalImages.length,
    sagittal:sagittalImages.length
  });
  return Object.freeze({
    id: 'wikimedia-normal-brain-case-1',
    title: 'Normal brain CT without intravenous contrast — three independent image stacks',
    description: 'A source-image preview of non-contrast brain CT in axial, coronal, and sagittal planes. The separate image sequences are not registered to a shared volume.',
    imageCount: axialImages.length,
    totalImageCount: axialImages.length + coronalImages.length + sagittalImages.length,
    planeCounts: counts,
    sourceName: 'Scrollable computed tomography images of a normal brain (case 1)',
    sourceAuthor: 'Mikael Häggström, M.D.',
    sourceUrl: 'https://commons.wikimedia.org/wiki/Scrollable_computed_tomography_images_of_a_normal_brain_(case_1)',
    license: 'CC0 1.0 Universal Public Domain Dedication',
    licenseUrl: 'https://creativecommons.org/publicdomain/zero/1.0/',
    reportedSliceThicknessMm: 4,
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
