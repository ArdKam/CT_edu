(function (root, factory) {
  'use strict';
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) root.CTEduBookmarkStore = api;
}(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const STORAGE_KEY = 'ctedu-bookmarks-v1';
  const APP_ID = 'ct-edu-bookmarks';
  const SCHEMA_VERSION = 1;
  const MAX_BOOKMARKS = 100;
  const MAX_NOTE_LENGTH = 500;
  const PLANES = new Set(['axial', 'coronal', 'sagittal']);
  const AXIS_FOR_PLANE = Object.freeze({ axial: 'k', coronal: 'j', sagittal: 'i' });
  function getDefaultStorage() {
    try { return typeof localStorage !== 'undefined' ? localStorage : null; }
    catch (error) { return null; }
  }
  function createId() { return 'bm-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 9); }
  function isSafeInteger(value, min, max) { return Number.isInteger(value) && value >= min && value <= max; }
  function normalizeCoordinates(value) {
    if (!value || typeof value !== 'object') return null;
    const result = {};
    for (const axis of ['i', 'j', 'k']) {
      const coordinate = Number(value[axis]);
      if (!isSafeInteger(coordinate, 0, 100000)) return null;
      result[axis] = coordinate;
    }
    return result;
  }
  function normalizeBookmark(value) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
    const caseId = typeof value.caseId === 'string' ? value.caseId.trim().slice(0, 100) : '';
    const plane = typeof value.plane === 'string' ? value.plane : '';
    const sliceIndex = Number(value.sliceIndex), sliceCount = Number(value.sliceCount);
    const coordinates = normalizeCoordinates(value.coordinates);
    const structureId = value.structureId == null ? '' : String(value.structureId).trim().slice(0, 100);
    const note = value.note == null ? '' : String(value.note);
    const id = typeof value.id === 'string' ? value.id.trim().slice(0, 80) : '';
    if (!caseId || !PLANES.has(plane) || !/^[a-zA-Z0-9_-]{1,80}$/.test(id)) return null;
    if (!isSafeInteger(sliceCount, 1, 10000) || !isSafeInteger(sliceIndex, 0, sliceCount - 1)) return null;
    if (!coordinates || coordinates[AXIS_FOR_PLANE[plane]] !== sliceIndex) return null;
    if (note.length > MAX_NOTE_LENGTH || /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/.test(note)) return null;
    const createdAt = Number(value.createdAt), updatedAt = Number(value.updatedAt == null ? value.createdAt : value.updatedAt);
    return {
      id: id, caseId: caseId, plane: plane, sliceIndex: sliceIndex, sliceCount: sliceCount,
      structureId: structureId, coordinates: coordinates, note: note,
      createdAt: Number.isFinite(createdAt) && createdAt > 0 ? Math.trunc(createdAt) : Date.now(),
      updatedAt: Number.isFinite(updatedAt) && updatedAt > 0 ? Math.trunc(updatedAt) : Date.now()
    };
  }
  function emptyData() { return { version: SCHEMA_VERSION, bookmarks: [] }; }
  function sameLocation(a, b) { return a.caseId === b.caseId && a.plane === b.plane && a.sliceIndex === b.sliceIndex && a.structureId === b.structureId; }
  function readData(storage) {
    if (!storage) return emptyData();
    try {
      const raw = storage.getItem(STORAGE_KEY);
      if (!raw) return emptyData();
      const parsed = JSON.parse(raw);
      if (!parsed || parsed.version !== SCHEMA_VERSION || !Array.isArray(parsed.bookmarks)) return emptyData();
      const normalized = parsed.bookmarks.map(normalizeBookmark).filter(Boolean), unique = [];
      normalized.forEach(function (bookmark) {
        const found = unique.findIndex(function (existing) { return existing.id === bookmark.id || sameLocation(existing, bookmark); });
        if (found >= 0) unique[found] = bookmark; else unique.push(bookmark);
      });
      return { version: SCHEMA_VERSION, bookmarks: unique.slice(-MAX_BOOKMARKS) };
    } catch (error) { return emptyData(); }
  }
  function getState(storage) {
    const store = arguments.length ? storage : getDefaultStorage();
    if (!store) return { available: false, count: 0, bookmarks: [] };
    try { store.getItem(STORAGE_KEY); } catch (error) { return { available: false, count: 0, bookmarks: [] }; }
    const items = readData(store).bookmarks;
    return { available: true, count: items.length, bookmarks: items };
  }
  function list(storage) { return getState(arguments.length ? storage : getDefaultStorage()).bookmarks; }
  function add(value, storage) {
    const store = arguments.length > 1 ? storage : getDefaultStorage();
    if (!store) return { saved: false, created: false, bookmark: null, reason: 'storage-unavailable' };
    const timestamp = Date.now();
    const input = Object.assign({}, value || {}, {
      id: value && value.id ? value.id : createId(),
      createdAt: value && value.createdAt ? value.createdAt : timestamp,
      updatedAt: timestamp
    });
    const normalized = normalizeBookmark(input);
    if (!normalized) return { saved: false, created: false, bookmark: null, reason: 'invalid-bookmark' };
    const data = readData(store);
    const index = data.bookmarks.findIndex(function (item) { return sameLocation(item, normalized); });
    const created = index < 0;
    if (created && data.bookmarks.length >= MAX_BOOKMARKS) return { saved: false, created: false, bookmark: null, reason: 'limit-reached' };
    if (index >= 0) {
      normalized.id = data.bookmarks[index].id;
      normalized.createdAt = data.bookmarks[index].createdAt;
      data.bookmarks[index] = normalized;
    } else data.bookmarks.push(normalized);
    try {
      store.setItem(STORAGE_KEY, JSON.stringify({ version: SCHEMA_VERSION, bookmarks: data.bookmarks }));
      return { saved: true, created: created, bookmark: normalized, reason: created ? 'created' : 'updated-existing' };
    } catch (error) { return { saved: false, created: false, bookmark: null, reason: 'storage-write-failed' }; }
  }
  function remove(id, storage) {
    const store = arguments.length > 1 ? storage : getDefaultStorage();
    if (!store) return { removed: false, reason: 'storage-unavailable' };
    const data = readData(store), next = data.bookmarks.filter(function (item) { return item.id !== id; });
    if (next.length === data.bookmarks.length) return { removed: false, reason: 'not-found' };
    try { store.setItem(STORAGE_KEY, JSON.stringify({ version: SCHEMA_VERSION, bookmarks: next })); return { removed: true, reason: null }; }
    catch (error) { return { removed: false, reason: 'storage-write-failed' }; }
  }
  function clear(storage) {
    const store = arguments.length ? storage : getDefaultStorage();
    if (!store) return false;
    try { store.removeItem(STORAGE_KEY); return true; } catch (error) { return false; }
  }
  function exportData(storage) {
    const state = getState(arguments.length ? storage : getDefaultStorage());
    return { app: APP_ID, version: SCHEMA_VERSION, exportedAt: Date.now(), bookmarks: state.bookmarks };
  }
  function importData(payload, storage) {
    const store = arguments.length > 1 ? storage : getDefaultStorage();
    if (!store) return { imported: false, count: 0, truncated: false, reason: 'storage-unavailable' };
    if (!payload || typeof payload !== 'object' || payload.app !== APP_ID || payload.version !== SCHEMA_VERSION || !Array.isArray(payload.bookmarks)) {
      return { imported: false, count: 0, truncated: false, reason: 'invalid-backup' };
    }
    const normalized = payload.bookmarks.map(normalizeBookmark);
    if (normalized.some(function (item) { return item === null; })) return { imported: false, count: 0, truncated: false, reason: 'invalid-bookmark' };
    const unique = [];
    normalized.forEach(function (bookmark) {
      const found = unique.findIndex(function (existing) { return existing.id === bookmark.id || sameLocation(existing, bookmark); });
      if (found >= 0) unique[found] = bookmark; else unique.push(bookmark);
    });
    const truncated = unique.length > MAX_BOOKMARKS, items = unique.slice(-MAX_BOOKMARKS);
    try {
      store.setItem(STORAGE_KEY, JSON.stringify({ version: SCHEMA_VERSION, bookmarks: items }));
      return { imported: true, count: items.length, truncated: truncated, reason: null };
    } catch (error) { return { imported: false, count: 0, truncated: false, reason: 'storage-write-failed' }; }
  }
  return Object.freeze({
    storageKey: STORAGE_KEY, appId: APP_ID, schemaVersion: SCHEMA_VERSION,
    maxBookmarks: MAX_BOOKMARKS, maxNoteLength: MAX_NOTE_LENGTH,
    getState: getState, list: list, add: add, remove: remove, clear: clear,
    exportData: exportData, importData: importData
  });
}));
