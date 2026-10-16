(function (root, factory) {
  'use strict';
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) root.CTEduSegmentorSourceMetadata = api;
}(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  // The Wikimedia axial PNGs are composites: the CT is on the left and a fixed coronal
  // locator panel occupies the right. Only the CT region is editable. Exact dimensions
  // are enforced per load; any dimension mismatch fails closed rather than guessing.
  const PROFILE = Object.freeze({
    id: 'wikimedia-axial-composite-layout-v1',
    datasetId: 'wikimedia-normal-abdomen-pelvis',
    datasetVersion: 'wikimedia-axial-320-v1',
    plane: 'axial',
    expectedWidth: 786,
    expectedHeight: 512,
    annotationRegion: Object.freeze({x:0,y:0,width:530,height:512}),
    panelRegion: Object.freeze({x:530,y:0,width:256,height:512}),
    confidence: 'source-layout-profile; dimension-gated; not a medical validation',
    supportsAnnotation: function (width,height,index) {
      return Number(width)===786 && Number(height)===512 && Number.isInteger(index) && index>=0 && index<320;
    },
    getRegion: function (width,height,index) {
      return this.supportsAnnotation(width,height,index) ? {x:0,y:0,width:530,height:512} : null;
    }
  });
  return PROFILE;
}));