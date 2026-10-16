(function (root, factory) {
  'use strict';
  const schema = typeof module !== 'undefined' && module.exports ? require('./annotation-schema.js') : root.CTEduSegmentorSchema;
  const api = factory(schema);
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) root.CTEduSegmentorStore = api;
}(typeof globalThis !== 'undefined' ? globalThis : this, function (schema) {
  'use strict';
  const DB_NAME='ct-edu-segmentor';
  const DB_VERSION=1;
  const RECORD_KEY='wikimedia-normal-abdomen-pelvis:annotations';
  function clone(value) { return value===undefined ? undefined : JSON.parse(JSON.stringify(value)); }
  function stable(value) {
    if (Array.isArray(value)) return '['+value.map(stable).join(',')+']';
    if (value && typeof value==='object') return '{'+Object.keys(value).sort().map(key=>JSON.stringify(key)+':'+stable(value[key])).join(',')+'}';
    return JSON.stringify(value);
  }
  function equal(a,b) { return stable(a)===stable(b); }
  function mergeProjects(current,incoming,mode) {
    schema.assertValidProject(current);
    schema.assertValidProject(incoming);
    if (current.dataset.id!==incoming.dataset.id || current.dataset.version!==incoming.dataset.version) throw new Error('Cannot merge different datasets or dataset versions.');
    if (mode==='replace') return clone(incoming);
    if (mode!=='merge') throw new Error('Import mode must be explicitly "merge" or "replace".');
    const merged=clone(current);
    const structureById=new Map(merged.structures.map(item=>[item.id,item]));
    for (const item of incoming.structures) {
      const existing=structureById.get(item.id);
      if (!existing) { merged.structures.push(clone(item)); structureById.set(item.id,item); }
      else if (!equal(existing,item)) throw new Error('Structure ID conflict for "'+item.id+'". Resolve the structure conflict before merging.');
    }
    for (const [imageId,incomingRecord] of Object.entries(incoming.images)) {
      const existingRecord=merged.images[imageId];
      if (!existingRecord) { merged.images[imageId]=clone(incomingRecord); continue; }
      if (!equal(existingRecord.sourceImage,incomingRecord.sourceImage)) throw new Error('Source-image identity conflict; no data was changed.');
      const byId=new Map(existingRecord.annotations.map(annotation=>[annotation.id,annotation]));
      for (const annotation of incomingRecord.annotations) {
        const previous=byId.get(annotation.id);
        if (!previous) { existingRecord.annotations.push(clone(annotation)); byId.set(annotation.id,annotation); }
        else if (!equal(previous,annotation)) throw new Error('Annotation ID conflict for "'+annotation.id+'". Existing manual work was preserved.');
      }
      existingRecord.updatedAt=new Date().toISOString();
      existingRecord.provenance=existingRecord.annotations.every(item=>item.provenance==='manual')?'manual':'mixed';
    }
    merged.updatedAt=new Date().toISOString();
    merged.exportMetadata=null;
    return schema.assertValidProject(merged);
  }
  function createIndexedDbAdapter(indexedDBRef) {
    if (!indexedDBRef || typeof indexedDBRef.open!=='function') throw new Error('IndexedDB is unavailable in this browser context.');
    let dbPromise=null;
    function openDb() {
      if (dbPromise) return dbPromise;
      dbPromise=new Promise((resolve,reject)=>{
        let request;
        try { request=indexedDBRef.open(DB_NAME,DB_VERSION); } catch (error) { reject(error); return; }
        request.onupgradeneeded=()=>{
          const database=request.result;
          if (!database.objectStoreNames.contains('projects')) database.createObjectStore('projects');
        };
        request.onsuccess=()=>resolve(request.result);
        request.onerror=()=>reject(request.error||new Error('IndexedDB could not be opened.'));
        request.onblocked=()=>reject(new Error('IndexedDB upgrade is blocked by another open CT Edu tab.'));
      });
      return dbPromise;
    }
    function read() {
      return openDb().then(db=>new Promise((resolve,reject)=>{
        let transaction;
        try { transaction=db.transaction('projects','readonly'); } catch (error) { reject(error); return; }
        const request=transaction.objectStore('projects').get(RECORD_KEY);
        request.onsuccess=()=>resolve(request.result ? clone(request.result) : null);
        request.onerror=()=>reject(request.error||new Error('IndexedDB read failed.'));
        transaction.onabort=()=>reject(transaction.error||new Error('IndexedDB read was aborted.'));
      }));
    }
    function update(mutator) {
      return openDb().then(db=>new Promise((resolve,reject)=>{
        let transaction, result, failed=false;
        try { transaction=db.transaction('projects','readwrite'); } catch (error) { reject(error); return; }
        const objectStore=transaction.objectStore('projects');
        const request=objectStore.get(RECORD_KEY);
        request.onsuccess=()=>{
          try {
            result=mutator(request.result ? clone(request.result) : null);
            if (result===null || result===undefined) {
              const remove=objectStore.delete(RECORD_KEY);
              remove.onerror=()=>{failed=true;reject(remove.error||new Error('IndexedDB delete failed.'));};
            } else {
              const put=objectStore.put(clone(result),RECORD_KEY);
              put.onerror=()=>{failed=true;reject(put.error||new Error('IndexedDB write failed.'));};
            }
          } catch (error) {
            failed=true;
            try { transaction.abort(); } catch (_) {}
            reject(error);
          }
        };
        request.onerror=()=>{failed=true;reject(request.error||new Error('IndexedDB read failed.'));};
        transaction.oncomplete=()=>{if (!failed) resolve(result===undefined?null:clone(result));};
        transaction.onerror=()=>{if (!failed) reject(transaction.error||new Error('IndexedDB transaction failed.'));};
        transaction.onabort=()=>{if (!failed) reject(transaction.error||new Error('IndexedDB transaction was aborted.'));};
      }));
    }
    return {read,update,close:async function(){if(dbPromise){const db=await dbPromise;db.close();dbPromise=null;}}};
  }
  function createStore(options) {
    const opts=options||{};
    let adapter;
    try {
      adapter=opts.adapter||createIndexedDbAdapter(opts.indexedDB===undefined ? (typeof indexedDB!=='undefined'?indexedDB:null) : opts.indexedDB);
    } catch (error) {
      // Keep the editor operational and expose storage failure through normal rejected operations.
      adapter={read:()=>Promise.reject(error),update:()=>Promise.reject(error),write:()=>Promise.reject(error)};
    }
    function updateProject(mutator) {
      if (typeof adapter.update==='function') return adapter.update(current=>{
        const project=current ? schema.assertValidProject(current) : schema.createProject();
        const next=mutator(clone(project));
        return next===null ? null : schema.assertValidProject(next);
      });
      return Promise.resolve(adapter.read()).then(current=>{
        const project=current ? schema.assertValidProject(current) : schema.createProject();
        const next=mutator(clone(project));
        if (next===null) return adapter.write(null).then(()=>null);
        schema.assertValidProject(next);
        return Promise.resolve(adapter.write(clone(next))).then(()=>clone(next));
      });
    }
    async function loadProject() {
      const value=await adapter.read();
      return value ? clone(schema.assertValidProject(value)) : schema.createProject();
    }
    async function saveImage(record,structures,expectedUpdatedAt) {
      return updateProject(project=>{
        const existing=project.images[record.sourceImage.id];
        if (existing && (!expectedUpdatedAt || existing.updatedAt!==expectedUpdatedAt)) {
          throw new Error('This image draft changed in another tab or since it was loaded. Reload it before saving to protect existing manual work.');
        }
        if (!existing && expectedUpdatedAt) {
          throw new Error('This image draft was removed or replaced after it was loaded. Reload before saving.');
        }
        const structureMap=new Map(project.structures.map(s=>[s.id,s]));
        (structures||[]).forEach(structure=>{
          const existing=structureMap.get(structure.id);
          if (!existing) { project.structures.push(clone(structure)); structureMap.set(structure.id,structure); }
          else if (!equal(existing,structure)) throw new Error('Structure ID conflict. Save cancelled to protect existing annotations.');
        });
        project.images[record.sourceImage.id]=clone(record);
        project.updatedAt=new Date().toISOString();
        project.exportMetadata=null;
        return project;
      });
    }
    async function importProject(incoming,mode) {
      schema.assertValidProject(incoming);
      return updateProject(current=>mode==='replace' ? clone(incoming) : mergeProjects(current,incoming,mode));
    }
    async function clearImage(imageId) {
      return updateProject(project=>{
        if (Object.prototype.hasOwnProperty.call(project.images,imageId)) delete project.images[imageId];
        project.updatedAt=new Date().toISOString();
        return project;
      });
    }
    async function exportProject() {
      const project=await loadProject();
      project.exportMetadata={exportedAt:new Date().toISOString(),app:'CT Edu Segmentor',format:'application/json'};
      return project;
    }
    return Object.freeze({loadProject,saveImage,importProject,clearImage,exportProject,close:adapter.close});
  }
  return Object.freeze({createStore,createIndexedDbAdapter,mergeProjects,DB_NAME,DB_VERSION,RECORD_KEY});
}));