const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { validateCaseRecord, validateFile, publicationGatesPass } = require('../scripts/validate_teaching_case.js');
const templatePath = path.join(__dirname, '..', 'cases', 'templates', 'teaching-case.template.json');
const template = JSON.parse(fs.readFileSync(templatePath, 'utf8'));
function publishableFixture() {
  const clone=JSON.parse(JSON.stringify(template));
  clone.id='approved-example-case';clone.status='approved';
  clone.titleFa='کیس آموزشی بازبینی‌شده';clone.titleEn='Reviewed teaching case';
  clone.descriptionFa='شرح آموزشی';clone.descriptionEn='Educational description';
  clone.source={id:'licensed-source',name:'Reviewed collection',version:'1.0',sourceUrl:'https://example.org/source',licenseReference:'CC BY 4.0',attribution:'Required attribution string',redistributionStatus:'verified-permitted'};
  clone.study={caseManifestId:'approved-study-1',sourceFormat:'NIfTI',seriesComplete:true,geometryValidated:true,orientationVerified:true,intensitySemantics:'verified stored intensities',projection:'unknown'};
  clone.objectives=['Identify and localize the target finding'];
  clone.guidedSteps=[{id:'step-1',promptFa:'یافته را مشخص کن',promptEn:'Identify the finding',responseType:'free-text'}];
  clone.rubric={criteria:[{id:'localization',labelFa:'مکان‌یابی',labelEn:'Localization',maxPoints:2}],referenceFindings:['Reviewed finding'],referenceImpression:'Reviewed impression',acceptedAlternatives:[],teachingRationaleFa:'توضیح',teachingRationaleEn:'Rationale'};
  clone.review=Object.fromEntries(['medical','technical','educational'].map(key=>[key,{status:'approved',reviewerRole:key+' reviewer',reviewerReference:'review-record-'+key,reviewedAt:'2026-10-11'}]));
  clone.privacy={patientMetadataReviewed:true,burnedInIdentifiersReviewed:true,noPatientIdentifiers:true};
  clone.publication={publicReleaseApproved:true,approvedBy:'release-review-record',approvedAt:'2026-10-11'};
  return clone;
}
test('empty authoring template validates as a draft but cannot be published',function(){
 const r=validateFile(templatePath);assert.equal(r.valid,true,r.errors.join('\n'));assert.equal(r.publishable,false);assert.equal(publicationGatesPass(template),false);
});
test('publication fails closed while data redistribution rights are unresolved',function(){
 const c=publishableFixture();c.source.redistributionStatus='review-required';const r=validateCaseRecord(c,{requirePublishable:true});assert.equal(r.valid,false);assert.ok(r.errors.some(x=>x.includes('/publication')));
});
test('a structurally complete candidate with every explicit gate passes the contract',function(){
 const r=validateCaseRecord(publishableFixture(),{requirePublishable:true});assert.equal(r.valid,true,r.errors.join('\n'));assert.equal(r.publishable,true);
});
test('approved status without independent review evidence is rejected',function(){
 const c=publishableFixture();c.review.medical.status='pending';const r=validateCaseRecord(c);assert.equal(r.valid,false);assert.ok(r.errors.some(x=>x.includes('/status')));
});
test('direct patient-identifier keys are rejected at any nesting depth',function(){
 const c=JSON.parse(JSON.stringify(template));c.clinicalContext.patientId='must-not-be-committed';const r=validateCaseRecord(c);assert.equal(r.valid,false);assert.ok(r.errors.some(x=>x.includes('patient identifiers')));
});
test('CT intensity semantics and radiograph projection are explicit',function(){
 const ct=publishableFixture();ct.study.intensitySemantics='';assert.equal(validateCaseRecord(ct).valid,false);
 const x=publishableFixture();x.modality='Radiograph';x.study.projection='oblique';assert.equal(validateCaseRecord(x).valid,false);
});
