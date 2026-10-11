#!/usr/bin/env node
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const FORBIDDEN_KEYS = new Set(['patientname','patientid','mrn','medicalrecordnumber','accessionnumber','dateofbirth','birthdate','nationalid','healthrecordnumber','patientidentifier']);
const STATUSES = new Set(['draft','review-required','approved']);
const REVIEW_SECTIONS = ['medical','technical','educational'];
function normalizedKey(key) { return String(key).toLowerCase().replace(/[^a-z0-9]/g, ''); }
function findSensitiveKeys(value, pointer, errors) {
  if (!value || typeof value !== 'object') return;
  for (const [key, child] of Object.entries(value)) {
    const next = pointer + '/' + key.replace(/~/g, '~0').replace(/\//g, '~1');
    if (FORBIDDEN_KEYS.has(normalizedKey(key))) errors.push(next + ': patient identifiers and direct identifiers are not permitted in case records');
    findSensitiveKeys(child, next, errors);
  }
}
function isText(value) { return typeof value === 'string' && value.trim().length > 0; }
function reviewIsApproved(review) {
  return Boolean(review && review.status === 'approved' && isText(review.reviewerRole) &&
    isText(review.reviewerReference) && typeof review.reviewedAt === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(review.reviewedAt));
}
function publicationGatesPass(record) {
  if (!record || typeof record !== 'object') return false;
  const source=record.source||{}, study=record.study||{}, privacy=record.privacy||{}, publication=record.publication||{}, rubric=record.rubric||{};
  return record.status==='approved' && source.redistributionStatus==='verified-permitted' &&
    isText(source.licenseReference) && isText(source.attribution) &&
    study.seriesComplete===true && study.geometryValidated===true && study.orientationVerified===true &&
    isText(study.intensitySemantics) && privacy.patientMetadataReviewed===true &&
    privacy.burnedInIdentifiersReviewed===true && privacy.noPatientIdentifiers===true &&
    REVIEW_SECTIONS.every(key=>reviewIsApproved((record.review||{})[key])) &&
    Array.isArray(record.objectives) && record.objectives.length>0 &&
    Array.isArray(record.guidedSteps) && record.guidedSteps.length>0 &&
    Array.isArray(rubric.criteria) && rubric.criteria.length>0 && publication.publicReleaseApproved===true;
}
function validateCaseRecord(record, options) {
  const opts=options||{}, errors=[];
  if (!record || typeof record!=='object' || Array.isArray(record)) return {valid:false,publishable:false,errors:['/: case record must be an object']};
  findSensitiveKeys(record,'',errors);
  if(record.schemaVersion!==1)errors.push('/schemaVersion: must equal 1');
  if(!isText(record.id)||!/^[a-z0-9][a-z0-9._-]{2,119}$/i.test(record.id))errors.push('/id: must be a stable identifier with 3–120 safe characters');
  if(!Number.isInteger(record.version)||record.version<1)errors.push('/version: must be an integer >= 1');
  if(!STATUSES.has(record.status))errors.push('/status: must be draft, review-required, or approved');
  if(!isText(record.region))errors.push('/region: required');
  if(!['CT','Radiograph'].includes(record.modality))errors.push('/modality: must be CT or Radiograph');
  for(const key of ['titleFa','titleEn','descriptionFa','descriptionEn'])if(!isText(record[key]))errors.push('/'+key+': required');
  const source=record.source;
  if(!source||typeof source!=='object')errors.push('/source: required object');
  else{
    for(const key of ['id','name','version','licenseReference','attribution','redistributionStatus'])if(!isText(source[key]))errors.push('/source/'+key+': required');
    if(!['review-required','verified-permitted','restricted'].includes(source.redistributionStatus))errors.push('/source/redistributionStatus: invalid status');
    if(source.sourceUrl&&!/^https:\/\//i.test(source.sourceUrl))errors.push('/source/sourceUrl: must be an HTTPS URL');
  }
  const study=record.study;
  if(!study||typeof study!=='object')errors.push('/study: required object');
  else{
    if(!isText(study.caseManifestId))errors.push('/study/caseManifestId: required');
    if(!isText(study.sourceFormat))errors.push('/study/sourceFormat: required');
    for(const key of ['seriesComplete','geometryValidated','orientationVerified'])if(typeof study[key]!=='boolean')errors.push('/study/'+key+': must be boolean');
    if(!isText(study.intensitySemantics))errors.push('/study/intensitySemantics: required; do not assume HU without verification');
    if(record.modality==='Radiograph'&&!['PA','AP','lateral','unknown'].includes(study.projection))errors.push('/study/projection: radiographs must identify PA, AP, lateral, or unknown');
  }
  if(!Array.isArray(record.objectives))errors.push('/objectives: must be an array');
  else record.objectives.forEach((value,index)=>{if(!isText(value))errors.push('/objectives/'+index+': must be non-empty text');});
  if(!Array.isArray(record.guidedSteps))errors.push('/guidedSteps: must be an array');
  else record.guidedSteps.forEach((step,index)=>{
    const p='/guidedSteps/'+index;
    if(!step||typeof step!=='object'){errors.push(p+': must be an object');return;}
    for(const key of ['id','promptFa','promptEn','responseType'])if(!isText(step[key]))errors.push(p+'/'+key+': required');
    if(!['free-text','single-select','multi-select','structure-location'].includes(step.responseType))errors.push(p+'/responseType: unsupported response type');
  });
  if(!record.rubric||typeof record.rubric!=='object'||!Array.isArray(record.rubric.criteria))errors.push('/rubric/criteria: must be an array');
  else record.rubric.criteria.forEach((item,index)=>{
    const p='/rubric/criteria/'+index;
    if(!item||typeof item!=='object'){errors.push(p+': must be an object');return;}
    for(const key of ['id','labelFa','labelEn'])if(!isText(item[key]))errors.push(p+'/'+key+': required');
    if(!Number.isFinite(item.maxPoints)||item.maxPoints<=0)errors.push(p+'/maxPoints: must be > 0');
  });
  if(!record.review||typeof record.review!=='object')errors.push('/review: required object');
  if(!record.privacy||typeof record.privacy!=='object')errors.push('/privacy: required object');
  if(!record.publication||typeof record.publication!=='object'||typeof record.publication.publicReleaseApproved!=='boolean')errors.push('/publication/publicReleaseApproved: explicit boolean required');
  const publishable=errors.length===0&&publicationGatesPass(record);
  if(record.status==='approved'&&!publishable)errors.push('/status: approved records must pass every medical, technical, educational, privacy, and rights gate');
  if(opts.requirePublishable&&!publishable)errors.push('/publication: publication requested but one or more release gates are incomplete');
  return {valid:errors.length===0,publishable:publishable,errors:errors};
}
function validateFile(filePath,options){
  try{return validateCaseRecord(JSON.parse(fs.readFileSync(path.resolve(filePath),'utf8')),options);}
  catch(error){return {valid:false,publishable:false,errors:['Could not read JSON case record: '+error.message]};}
}
module.exports={validateCaseRecord,validateFile,publicationGatesPass};
if(require.main===module){
  const args=process.argv.slice(2),requirePublishable=args.includes('--require-publishable'),files=args.filter(arg=>arg!=='--require-publishable');
  if(files.length!==1){process.stderr.write('Usage: node scripts/validate_teaching_case.js <case.json> [--require-publishable]\n');process.exitCode=2;}
  else{
    const result=validateFile(files[0],{requirePublishable});
    if(result.valid)process.stdout.write('VALID case record: '+path.resolve(files[0])+(result.publishable?' (publishable gates complete)\n':' (draft/review-only; not publishable)\n'));
    else{process.stderr.write('INVALID case record:\n- '+result.errors.join('\n- ')+'\n');process.exitCode=1;}
  }
}
