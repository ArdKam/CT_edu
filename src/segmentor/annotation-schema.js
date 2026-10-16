(function (root, factory) {
  'use strict';
  const geometry = typeof module !== 'undefined' && module.exports ? require('./geometry.js') : root.CTEduSegmentorGeometry;
  const api = factory(geometry);
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) root.CTEduSegmentorSchema = api;
}(typeof globalThis !== 'undefined' ? globalThis : this, function (geometry) {
  'use strict';
  const SCHEMA_VERSION = 1;
  const DATASET_ID = 'wikimedia-normal-abdomen-pelvis';
  const DATASET_VERSION = 'wikimedia-axial-320-v1';
  const ALLOWED_PLANES = ['axial'];
  const ALLOWED_PROVENANCE = ['manual','intensity-suggestion','ai-proposal'];
  const ALLOWED_REVIEW = ['draft','in-review','reviewed','rejected'];
  const COLORS = /^#[0-9a-fA-F]{6}$/;
  const clone = value => JSON.parse(JSON.stringify(value));
  function id(prefix) {
    const random = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() :
      'xxxxxxxxyxxx4xxxyxxxyxxxxxxxxxxx'.replace(/[xy]/g, c => {
        const r=Math.random()*16|0; return (c==='x'?r:(r&3|8)).toString(16);
      });
    return prefix + '-' + random;
  }
  function now() { return new Date().toISOString(); }
  function createProject() {
    return {
      schemaVersion:SCHEMA_VERSION,
      projectId:'ct-edu-segmentor-wikimedia-axial',
      dataset:{id:DATASET_ID,version:DATASET_VERSION},
      structures:[{id:'structure-unclassified',name:'Unclassified',color:'#f2b84b'}],
      images:{},
      createdAt:now(),
      updatedAt:now(),
      exportMetadata:null
    };
  }
  function createStructure(name,color) {
    const cleanName=String(name||'').trim();
    const cleanColor=String(color||'').trim();
    if (!cleanName || cleanName.length>100) throw new Error('Structure name must be between 1 and 100 characters.');
    if (!COLORS.test(cleanColor)) throw new Error('Structure color must be a six-digit hex color.');
    return {id:id('structure'),name:cleanName,color:cleanColor.toLowerCase()};
  }
  function createAnnotation({structureId,points,labelPoint,name,color,sourceImageId}) {
    const timestamp=now();
    return {
      id:id('annotation'),structureId:String(structureId||''),sourceImageId:String(sourceImageId||''),
      displayName:String(name||'').trim(),color:COLORS.test(String(color||''))?String(color).toLowerCase():null,
      points:geometry.clonePoints(points||[]),labelPoint:labelPoint?{x:Number(labelPoint.x),y:Number(labelPoint.y)}:null,
      provenance:'manual',reviewStatus:'draft',createdAt:timestamp,updatedAt:timestamp
    };
  }
  function imageIdentity(index,url) {
    return DATASET_ID+'@'+DATASET_VERSION+'|axial|'+String(index+1)+'|'+String(url);
  }
  function createImageRecord({index,url,width,height,annotationRegion,annotations,geometryProfile}) {
    const sourceId=imageIdentity(index,url);
    return {
      sourceImage:{
        id:sourceId,datasetId:DATASET_ID,datasetVersion:DATASET_VERSION,plane:'axial',
        index:index,url:url,width:width,height:height,geometryProfile:geometryProfile||'wikimedia-axial-composite-layout-v1',
        coordinateSystem:'native-source-pixel',annotationRegion:clone(annotationRegion)
      },
      annotations:Array.isArray(annotations)?clone(annotations):[],
      provenance:'manual',reviewStatus:'draft',
      createdAt:now(),updatedAt:now()
    };
  }
  function isPlainObject(value) {
    if (!value || typeof value!=='object' || Array.isArray(value)) return false;
    const proto=Object.getPrototypeOf(value);
    return proto===Object.prototype || proto===null;
  }
  function validIso(value) { return typeof value==='string' && Number.isFinite(Date.parse(value)); }
  function allowedImageUrl(value,expectedIndex) {
    if (typeof value!=='string' || value.length>2048) return false;
    try {
      const url=new URL(value);
      if (url.protocol!=='https:' || (url.hostname!=='upload.wikimedia.org' && url.hostname!=='commons.wikimedia.org')) return false;
      const match=/CT_of_a_normal_abdomen_and_pelvis,_axial_plane_([0-9]+)\.png$/i.exec(decodeURIComponent(url.pathname));
      return !!match && (!Number.isInteger(expectedIndex) || Number(match[1])===expectedIndex+1);
    } catch (_) { return false; }
  }
  function validateProject(project) {
    const errors=[];
    const add=(path,message)=>errors.push({path,message});
    if (!isPlainObject(project)) return {valid:false,errors:[{path:'$',message:'Expected a JSON object.'}]};
    if (project.schemaVersion!==SCHEMA_VERSION) add('schemaVersion','Unsupported annotation schema version.');
    if (project.projectId!=='ct-edu-segmentor-wikimedia-axial') add('projectId','Unexpected project identity.');
    if (!isPlainObject(project.dataset) || project.dataset.id!==DATASET_ID || project.dataset.version!==DATASET_VERSION) add('dataset','Dataset identity or version does not match this preview.');
    if (!Array.isArray(project.structures) || project.structures.length>1000) add('structures','Structures must be an array of at most 1000 items.');
    const structures=Array.isArray(project.structures)?project.structures:[];
    const structureIds=new Set();
    structures.forEach((structure,i)=>{
      const path='structures['+i+']';
      if (!isPlainObject(structure)) { add(path,'Structure must be an object.'); return; }
      if (typeof structure.id!=='string' || !/^structure-[a-zA-Z0-9-]{8,100}$/.test(structure.id)) add(path+'.id','Invalid stable structure ID.');
      else if (structureIds.has(structure.id)) add(path+'.id','Duplicate structure ID.');
      else structureIds.add(structure.id);
      if (typeof structure.name!=='string' || !structure.name.trim() || structure.name.length>100) add(path+'.name','Invalid structure display name.');
      if (typeof structure.color!=='string' || !COLORS.test(structure.color)) add(path+'.color','Invalid structure color.');
    });
    if (!isPlainObject(project.images)) add('images','Images must be an object keyed by stable source-image identity.');
    const images=isPlainObject(project.images)?project.images:{};
    const annotationIds=new Set();
    for (const key of Object.keys(images)) {
      const record=images[key], path='images.'+key;
      if (key==='__proto__' || key==='constructor' || key==='prototype') { add(path,'Unsafe object key.'); continue; }
      if (!isPlainObject(record) || !isPlainObject(record.sourceImage) || !Array.isArray(record.annotations)) { add(path,'Malformed image annotation record.'); continue; }
      const source=record.sourceImage;
      if (key!==source.id || typeof source.id!=='string') add(path+'.sourceImage.id','Record key must match its stable source-image ID.');
      if (source.datasetId!==DATASET_ID || source.datasetVersion!==DATASET_VERSION) add(path+'.sourceImage','Source dataset/version mismatch.');
      if (!ALLOWED_PLANES.includes(source.plane)) add(path+'.sourceImage.plane','Only the independent axial source stack is supported in this MVP.');
      if (!Number.isInteger(source.index) || source.index<0 || source.index>=320) add(path+'.sourceImage.index','Source image index is out of range.');
      if (!allowedImageUrl(source.url,source.index)) add(path+'.sourceImage.url','Unsupported, non-axial, or index-mismatched source URL.');
      if (Number(source.width)!==786 || Number(source.height)!==512 || source.geometryProfile!=='wikimedia-axial-composite-layout-v1') add(path+'.sourceImage','Image dimensions do not match the supported source-layout profile.');
      if (source.coordinateSystem!=='native-source-pixel') add(path+'.sourceImage.coordinateSystem','Coordinates must be stored in native source-image pixels.');
      const region=source.annotationRegion;
      if (!region || region.x!==0 || region.y!==0 || region.width!==530 || region.height!==512) add(path+'.sourceImage.annotationRegion','Annotation region must match the known CT-only crop; the right reference panel is excluded.');
      if (source.id!==imageIdentity(source.index,source.url)) add(path+'.sourceImage.id','Stable image ID does not match dataset, index and source URL.');
      if (record.provenance!=='manual' && record.provenance!=='mixed') add(path+'.provenance','Invalid record provenance.');
      if (!ALLOWED_REVIEW.includes(record.reviewStatus)) add(path+'.reviewStatus','Invalid review state.');
      else if (record.reviewStatus!=='draft') add(path+'.reviewStatus','This preview accepts drafts only; review states require an independent review workflow.');
      if (!validIso(record.createdAt) || !validIso(record.updatedAt)) add(path+'.timestamps','Invalid image record timestamps.');
      if (record.annotations.length>10000) add(path+'.annotations','Too many annotations for one image.');
      record.annotations.forEach((annotation,j)=>{
        const p=path+'.annotations['+j+']';
        if (!isPlainObject(annotation)) { add(p,'Annotation must be an object.'); return; }
        if (typeof annotation.id!=='string' || !/^annotation-[a-zA-Z0-9-]{8,100}$/.test(annotation.id)) add(p+'.id','Invalid annotation ID.');
        else if (annotationIds.has(annotation.id)) add(p+'.id','Annotation IDs must be globally unique.');
        else annotationIds.add(annotation.id);
        if (!structureIds.has(annotation.structureId)) add(p+'.structureId','Annotation must reference a structure by ID.');
        if (annotation.sourceImageId!==source.id) add(p+'.sourceImageId','Annotation is attached to a different source image.');
        if (typeof annotation.displayName!=='string' || annotation.displayName.length>100) add(p+'.displayName','Invalid annotation display name.');
        if (annotation.color!==null && annotation.color!==undefined && !COLORS.test(annotation.color)) add(p+'.color','Invalid annotation color.');
        const result=geometry.validatePolygon(annotation.points,region);
        if (!result.valid) add(p+'.points','Invalid polygon geometry: '+result.error+'.');
        if (annotation.labelPoint!==null && annotation.labelPoint!==undefined && !geometry.insideRegion(annotation.labelPoint,region,0)) add(p+'.labelPoint','Label point lies outside the CT-only region.');
        if (!ALLOWED_PROVENANCE.includes(annotation.provenance)) add(p+'.provenance','Invalid annotation provenance.');
        if (!ALLOWED_REVIEW.includes(annotation.reviewStatus)) add(p+'.reviewStatus','Invalid annotation review state.');
        else if (annotation.reviewStatus!=='draft') add(p+'.reviewStatus','This preview accepts drafts only; review states require an independent review workflow.');
        if (annotation.reviewStatus==='reviewed' && annotation.provenance==='manual' && !validIso(annotation.reviewedAt)) add(p+'.reviewedAt','Reviewed state requires a review timestamp.');
        if (!validIso(annotation.createdAt) || !validIso(annotation.updatedAt)) add(p+'.timestamps','Invalid annotation timestamps.');
      });
    }
    if (!validIso(project.createdAt) || !validIso(project.updatedAt)) add('timestamps','Invalid project timestamps.');
    if (project.exportMetadata!==null && project.exportMetadata!==undefined && !isPlainObject(project.exportMetadata)) add('exportMetadata','Invalid export metadata.');
    return {valid:errors.length===0,errors:errors};
  }
  function assertValidProject(project) {
    const result=validateProject(project);
    if (!result.valid) {
      const error=new Error('Annotation project validation failed: '+result.errors.slice(0,5).map(x=>x.path+' '+x.message).join(' '));
      error.validationErrors=result.errors;
      throw error;
    }
    return project;
  }
  return Object.freeze({SCHEMA_VERSION,DATASET_ID,DATASET_VERSION,ALLOWED_PLANES,ALLOWED_PROVENANCE,ALLOWED_REVIEW,createProject,createStructure,createAnnotation,imageIdentity,createImageRecord,validateProject,assertValidProject,clone,now,allowedImageUrl});
}));