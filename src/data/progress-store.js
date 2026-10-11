(function (root) {
  'use strict';

  const STORAGE_KEY = 'ctedu-learning-progress-v1';
  const SCHEMA_VERSION = 1;
  const MAX_ATTEMPTS = 500;

  function getDefaultStorage() {
    try {
      return root && root.localStorage ? root.localStorage : null;
    } catch (error) {
      return null;
    }
  }

  function emptyData() {
    return { version: SCHEMA_VERSION, attempts: [] };
  }

  function normalizeAttempt(value) {
    if (!value || typeof value !== 'object') return null;
    const caseId = String(value.caseId || '').slice(0, 100);
    const region = String(value.region || '').slice(0, 40);
    const skill = String(value.skill || '').slice(0, 80);
    const targetId = String(value.targetId || '').slice(0, 100);
    const selectedId = String(value.selectedId || '').slice(0, 100);
    if (!caseId || !region || !skill || !targetId || !selectedId) return null;
    if (typeof value.isCorrect !== 'boolean') return null;
    const timestamp = Number(value.timestamp);
    return {
      caseId: caseId,
      region: region,
      skill: skill,
      targetId: targetId,
      selectedId: selectedId,
      isCorrect: value.isCorrect,
      timestamp: Number.isFinite(timestamp) && timestamp > 0 ? Math.trunc(timestamp) : 0
    };
  }

  function readData(storage) {
    if (!storage) return emptyData();
    try {
      const raw = storage.getItem(STORAGE_KEY);
      if (!raw) return emptyData();
      const parsed = JSON.parse(raw);
      if (!parsed || parsed.version !== SCHEMA_VERSION || !Array.isArray(parsed.attempts)) {
        return emptyData();
      }
      return {
        version: SCHEMA_VERSION,
        attempts: parsed.attempts.map(normalizeAttempt).filter(Boolean).slice(-MAX_ATTEMPTS)
      };
    } catch (error) {
      return emptyData();
    }
  }

  function getSummary(storage) {
    const store = arguments.length ? storage : getDefaultStorage();
    if (!store) {
      return {
        available: false,
        totalAttempts: 0,
        correctAttempts: 0,
        accuracy: 0,
        distinctStructures: 0,
        lastAttemptAt: null
      };
    }
    try {
      store.getItem(STORAGE_KEY);
    } catch (error) {
      return {
        available: false,
        totalAttempts: 0,
        correctAttempts: 0,
        accuracy: 0,
        distinctStructures: 0,
        lastAttemptAt: null
      };
    }
    const attempts = readData(store).attempts;
    const correctAttempts = attempts.filter(function (attempt) { return attempt.isCorrect; }).length;
    const targets = new Set(attempts.map(function (attempt) { return attempt.targetId; }));
    return {
      available: true,
      totalAttempts: attempts.length,
      correctAttempts: correctAttempts,
      accuracy: attempts.length ? Math.round(correctAttempts * 100 / attempts.length) : 0,
      distinctStructures: targets.size,
      lastAttemptAt: attempts.length ? attempts[attempts.length - 1].timestamp : null
    };
  }

  function recordAttempt(attempt, storage) {
    const store = arguments.length > 1 ? storage : getDefaultStorage();
    const normalized = normalizeAttempt(attempt);
    if (!store || !normalized) {
      return { saved: false, summary: getSummary(store) };
    }

    if (!normalized.timestamp) normalized.timestamp = Date.now();
    const data = readData(store);
    data.attempts.push(normalized);
    if (data.attempts.length > MAX_ATTEMPTS) {
      data.attempts = data.attempts.slice(-MAX_ATTEMPTS);
    }

    try {
      store.setItem(STORAGE_KEY, JSON.stringify(data));
      return { saved: true, summary: getSummary(store) };
    } catch (error) {
      return { saved: false, summary: getSummary(store) };
    }
  }

  function clear(storage) {
    const store = arguments.length ? storage : getDefaultStorage();
    if (!store) return false;
    try {
      store.removeItem(STORAGE_KEY);
      return true;
    } catch (error) {
      return false;
    }
  }

  const api = {
    storageKey: STORAGE_KEY,
    maxAttempts: MAX_ATTEMPTS,
    getSummary: getSummary,
    recordAttempt: recordAttempt,
    clear: clear
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) root.CTEduProgressStore = api;
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : this));
