const test=require('node:test');
const assert=require('node:assert/strict');
const geometry=require('../src/segmentor/geometry.js');
const schema=require('../src/segmentor/annotation-schema.js');
const storeApi=require('../src/segmentor/annotation-store.js');
const metadata=require('../src/segmentor/source-metadata.js');

function fixture(index=159) {
  const url='https://upload.wikimedia.org/wikipedia/commons/6/6c/CT_of_a_normal_abdomen_and_pelvis%2C_axial_plane_'+(index+1)+'.png';
  const project=schema.createProject();
  const record=schema.createImageRecord({index,url,width:786,height:346,annotationRegion:metadata.annotationRegion,geometryProfile:metadata.id});
  const annotation=schema.createAnnotation({
    structureId:project.structures[0].id,sourceImageId:record.sourceImage.id,
    points:[{x:80,y:90},{x:190,y:90},{x:190,y:210},{x:80,y:210}],labelPoint:{x:135,y:150}
  });
  record.annotations.push(annotation);project.images[record.sourceImage.id]=record;
  return {project,record,annotation};
}
function memoryAdapter(initial=null) {
  let value=initial?JSON.parse(JSON.stringify(initial)):null;
  return {
    read:async()=>value===null?null:JSON.parse(JSON.stringify(value)),
    write:async next=>{value=next===null?null:JSON.parse(JSON.stringify(next));},
    update:async mutator=>{const next=mutator(value===null?null:JSON.parse(JSON.stringify(value)));value=next===null?null:JSON.parse(JSON.stringify(next));return value===null?null:JSON.parse(JSON.stringify(value));},
    inspect:()=>value===null?null:JSON.parse(JSON.stringify(value))
  };
}

test('native coordinates round-trip through affine transforms at varied zooms, aspect ratios and pan offsets',()=>{
  const points=[{x:0,y:0},{x:265,y:256},{x:529.5,y:511}];
  const transforms=[
    {a:1,b:0,c:0,d:1,e:0,f:0},
    {a:0.75,b:0,c:0,d:0.75,e:143,f:88},
    {a:2.5,b:0,c:0,d:2.5,e:-340,f:210},
    {a:1.37,b:0,c:0,d:1.37,e:17.5,f:-90},
    {a:1.2,b:0.08,c:-0.05,d:1.4,e:60,f:22}
  ];
  for(const matrix of transforms)for(const point of points){
    const screen=geometry.transformPoint(point,matrix);
    const roundTrip=geometry.clientToNative(screen.x,screen.y,matrix);
    assert.ok(roundTrip);
    assert.ok(Math.abs(roundTrip.x-point.x)<1e-7);
    assert.ok(Math.abs(roundTrip.y-point.y)<1e-7);
  }
  assert.equal(geometry.clientToNative(1,2,{a:0,b:0,c:0,d:0,e:0,f:0}),null);
});

test('CT-only region rejects reference panel clicks and out-of-bounds points',()=>{
  assert.deepEqual(metadata.getRegion(786,346,159),{x:0,y:0,width:530,height:346});
  assert.equal(metadata.getRegion(786,347,159),null);
  assert.equal(metadata.getRegion(1200,346,159),null);
  assert.equal(metadata.getRegion(786,346,320),null);
  assert.equal(geometry.insideRegion({x:529.9,y:345.9},metadata.annotationRegion),true);
  assert.equal(geometry.insideRegion({x:530.1,y:20},metadata.annotationRegion),false);
  assert.equal(geometry.insideRegion({x:700,y:200},metadata.annotationRegion),false);
  assert.equal(geometry.validatePolygon([{x:520,y:10},{x:540,y:20},{x:520,y:40}],metadata.annotationRegion).valid,false);
});

test('polygon validator rejects degenerate, self-intersecting, repeated and non-finite contours',()=>{
  assert.equal(geometry.validatePolygon([{x:1,y:1},{x:2,y:2}],metadata.annotationRegion).error,'too-few-vertices');
  assert.equal(geometry.validatePolygon([{x:1,y:1},{x:30,y:30},{x:1,y:1}],metadata.annotationRegion).valid,false);
  assert.equal(geometry.validatePolygon([{x:10,y:10},{x:50,y:50},{x:10,y:50},{x:50,y:10}],metadata.annotationRegion).error,'self-intersection');
  assert.equal(geometry.validatePolygon([{x:1,y:1},{x:10,y:1},{x:20,y:1}],metadata.annotationRegion).error,'degenerate-area');
  assert.equal(geometry.validatePolygon([{x:1,y:1},{x:10,y:1},{x:10,y:10},{x:NaN,y:5}],metadata.annotationRegion).error,'non-finite-coordinate');
  assert.equal(geometry.validatePolygon([{x:1,y:1},{x:10,y:1},{x:10,y:10}],metadata.annotationRegion).valid,true);
});

test('versioned annotation schema stores native coordinates, stable source identity and draft provenance',()=>{
  const {project,record,annotation}=fixture();
  assert.equal(schema.validateProject(project).valid,true);
  assert.equal(record.sourceImage.coordinateSystem,'native-source-pixel');
  assert.equal(record.sourceImage.plane,'axial');
  assert.equal(record.sourceImage.id,schema.imageIdentity(159,record.sourceImage.url));
  assert.equal(annotation.provenance,'manual');
  assert.equal(annotation.reviewStatus,'draft');
  assert.equal(schema.allowedImageUrl(record.sourceImage.url,159),true);
  assert.equal(schema.allowedImageUrl(record.sourceImage.url+'?download=1',159),false);
  assert.equal(schema.allowedImageUrl(record.sourceImage.url,158),false);
  assert.equal(project.images[record.sourceImage.id].annotations[0].sourceImageId,record.sourceImage.id);
  const roundTrip=JSON.parse(JSON.stringify(project));
  assert.deepEqual(schema.validateProject(roundTrip),{valid:true,errors:[]});
});

test('schema rejects other planes, wrong dataset versions, changed dimensions, wrong URL-index binding and panel coordinates',()=>{
  const variants=[];
  for(const mutate of [
    p=>{p.dataset.version='future-version';},
    p=>{p.images[Object.keys(p.images)[0]].sourceImage.plane='coronal';},
    p=>{p.images[Object.keys(p.images)[0]].sourceImage.width=512;},
    p=>{p.images[Object.keys(p.images)[0]].sourceImage.height=512;},
    p=>{const record=p.images[Object.keys(p.images)[0]];record.sourceImage.url=record.sourceImage.url.replace('plane_160','plane_1');record.sourceImage.id=schema.imageIdentity(record.sourceImage.index,record.sourceImage.url);const key=Object.keys(p.images)[0];delete p.images[key];p.images[record.sourceImage.id]=record;record.annotations.forEach(annotation=>annotation.sourceImageId=record.sourceImage.id);},
    p=>{const record=p.images[Object.keys(p.images)[0]];record.annotations[0].points[0].x=700;},
    p=>{const record=p.images[Object.keys(p.images)[0]];record.annotations[0].sourceImageId='another-image';}
  ]) { const value=fixture().project;mutate(value);variants.push(value); }
  variants.forEach(value=>assert.equal(schema.validateProject(value).valid,false));
  const falselyReviewed=fixture().project;
  falselyReviewed.images[Object.keys(falselyReviewed.images)[0]].reviewStatus='reviewed';
  assert.equal(schema.validateProject(falselyReviewed).valid,false,'a draft-only preview must not accept a forged reviewed status');
});

test('storage saves, reloads, exports and clears a single image without crossing source identities',async()=>{
  const adapter=memoryAdapter(),store=storeApi.createStore({adapter});
  const {project,record}=fixture();
  await store.saveImage(record,project.structures);
  const restored=await store.loadProject();
  assert.deepEqual(restored.images[record.sourceImage.id],record);
  assert.equal(Object.keys(restored.images).length,1);
  assert.equal((await store.exportProject()).exportMetadata.format,'application/json');
  const other=fixture(160).record;
  await store.saveImage({...other,annotations:[]},project.structures);
  assert.equal(Object.keys((await store.loadProject()).images).length,2);
  await store.clearImage(record.sourceImage.id);
  const after=await store.loadProject();
  assert.equal(Object.keys(after.images).length,1);
  assert.ok(after.images[other.sourceImage.id]);
});

test('import merge is idempotent, conflicts do not overwrite, and replacement is explicit',async()=>{
  const first=fixture(),second=fixture(160),adapter=memoryAdapter(),store=storeApi.createStore({adapter});
  await store.saveImage(first.record,first.project.structures);
  await store.importProject(first.project,'merge');
  assert.equal(Object.keys((await store.loadProject()).images).length,1);
  const incoming=fixture();
  incoming.annotation=incoming.record.annotations[0];
  incoming.annotation.id=first.annotation.id;
  incoming.annotation.points[0].x=123;
  incoming.annotation.updatedAt=new Date().toISOString();
  await assert.rejects(()=>store.importProject(incoming.project,'merge'),/Annotation ID conflict/);
  assert.equal((await store.loadProject()).images[first.record.sourceImage.id].annotations[0].points[0].x,80);
  await store.importProject(second.project,'merge');
  assert.equal(Object.keys((await store.loadProject()).images).length,2);
  await assert.rejects(()=>store.importProject(second.project,'silent-overwrite'),/explicitly/);
  await store.importProject(second.project,'replace');
  const replacement=await store.loadProject();
  assert.equal(Object.keys(replacement.images).length,1);
  assert.ok(replacement.images[second.record.sourceImage.id]);
  assert.equal(schema.validateProject(replacement).valid,true);
});

test('structure conflicts are rejected by ID rather than inferred from display names',async()=>{
  const a=fixture(),b=fixture(160),adapter=memoryAdapter(),store=storeApi.createStore({adapter});
  await store.saveImage(a.record,a.project.structures);
  b.project.structures[0].color='#00ff00';
  await assert.rejects(()=>store.importProject(b.project,'merge'),/Structure ID conflict/);
  const current=await store.loadProject();
  assert.equal(current.structures[0].color,'#f2b84b');
});

test('storage-unavailable is surfaced rather than silently falling back or reporting a save',async()=>{
  const store=storeApi.createStore({adapter:{read:async()=>{throw new Error('blocked by browser policy');},update:async()=>{throw new Error('blocked by browser policy');}}});
  await assert.rejects(()=>store.loadProject(),/blocked by browser policy/);
  const {record,project}=fixture();
  await assert.rejects(()=>store.saveImage(record,project.structures),/blocked by browser policy/);
});
test('optimistic saves refuse stale or concurrent edits instead of overwriting them',async()=>{
  const first=fixture(),adapter=memoryAdapter(),store=storeApi.createStore({adapter});
  await store.saveImage(first.record,first.project.structures,null);
  const loaded=await store.loadProject(),imageId=first.record.sourceImage.id;
  const staleTimestamp=loaded.images[imageId].updatedAt;
  const concurrent=JSON.parse(JSON.stringify(loaded.images[imageId]));
  concurrent.updatedAt=new Date(Date.now()+1000).toISOString();
  concurrent.annotations[0].displayName='Edited in another tab';
  await adapter.update(project=>{project.images[imageId]=concurrent;return project;});
  const candidate=JSON.parse(JSON.stringify(loaded.images[imageId]));
  candidate.updatedAt=new Date().toISOString();
  await assert.rejects(()=>store.saveImage(candidate,loaded.structures,staleTimestamp),/changed in another tab/);
  assert.equal((await store.loadProject()).images[imageId].annotations[0].displayName,'Edited in another tab');
});