const test = require('node:test');
const assert = require('node:assert/strict');
const progress = require('../src/data/progress-store.js');

function makeStorage(initial) {
  const data = new Map(Object.entries(initial || {}));
  return {
    getItem: function (key) { return data.has(key) ? data.get(key) : null; },
    setItem: function (key, value) { data.set(key, String(value)); },
    removeItem: function (key) { data.delete(key); },
    raw: function (key) { return data.get(key); }
  };
}

function attempt(overrides) {
  return Object.assign({
    caseId: 'spl-abdomen-normal-atlas',
    region: 'abdomen',
    skill: 'structure-identification',
    targetId: 'liver',
    selectedId: 'liver',
    isCorrect: true,
    timestamp: 1700000000000
  }, overrides || {});
}

test('local progress starts empty and only reports aggregate learning metrics', function () {
  const storage = makeStorage();
  const summary = progress.getSummary(storage);
  assert.deepEqual(summary, {
    available: true,
    totalAttempts: 0,
    correctAttempts: 0,
    accuracy: 0,
    distinctStructures: 0,
    lastAttemptAt: null
  });
});

test('valid quiz answers are recorded and aggregate accuracy updates reproducibly', function () {
  const storage = makeStorage();
  assert.equal(progress.recordAttempt(attempt(), storage).saved, true);
  progress.recordAttempt(attempt({ targetId: 'spleen', selectedId: 'aorta', isCorrect: false, timestamp: 1700000001000 }), storage);
  progress.recordAttempt(attempt({ targetId: 'aorta', selectedId: 'aorta', isCorrect: true, timestamp: 1700000002000 }), storage);
  assert.deepEqual(progress.getSummary(storage), {
    available: true,
    totalAttempts: 3,
    correctAttempts: 2,
    accuracy: 67,
    distinctStructures: 3,
    lastAttemptAt: 1700000002000
  });
});

test('invalid answer payloads are rejected and do not pollute history', function () {
  const storage = makeStorage();
  assert.equal(progress.recordAttempt(attempt({ targetId: '', selectedId: '' }), storage).saved, false);
  assert.equal(progress.recordAttempt(attempt({ isCorrect: 'yes' }), storage).saved, false);
  assert.equal(progress.getSummary(storage).totalAttempts, 0);
});

test('malformed or outdated stored data safely resets to an empty view', function () {
  const malformed = makeStorage({ [progress.storageKey]: '{not json' });
  assert.equal(progress.getSummary(malformed).totalAttempts, 0);
  const oldVersion = makeStorage({ [progress.storageKey]: JSON.stringify({ version: 99, attempts: [attempt()] }) });
  assert.equal(progress.getSummary(oldVersion).totalAttempts, 0);
});

test('history is bounded to the configured retention limit', function () {
  const records = Array.from({ length: progress.maxAttempts }, function (_, index) {
    return attempt({ timestamp: 1700000000000 + index });
  });
  const storage = makeStorage({
    [progress.storageKey]: JSON.stringify({ version: 1, attempts: records })
  });
  progress.recordAttempt(attempt({ targetId: 'spleen', timestamp: 1800000000000 }), storage);
  const parsed = JSON.parse(storage.raw(progress.storageKey));
  assert.equal(parsed.attempts.length, progress.maxAttempts);
  assert.equal(parsed.attempts[parsed.attempts.length - 1].targetId, 'spleen');
});

test('blocked or quota-limited browser storage does not throw into quiz interactions', function () {
  const unavailable = progress.getSummary(null);
  assert.equal(unavailable.available, false);
  const blocked = {
    getItem: function () { return null; },
    setItem: function () { throw new Error('quota exceeded'); },
    removeItem: function () { throw new Error('storage blocked'); }
  };
  assert.equal(progress.recordAttempt(attempt(), blocked).saved, false);
  assert.equal(progress.clear(blocked), false);
});

test('clearing removes only this app’s local progress key', function () {
  const storage = makeStorage({
    [progress.storageKey]: JSON.stringify({ version: 1, attempts: [attempt()] }),
    'another-app-key': 'keep me'
  });
  assert.equal(progress.clear(storage), true);
  assert.equal(storage.raw(progress.storageKey), undefined);
  assert.equal(storage.raw('another-app-key'), 'keep me');
});

test('versioned backup exports a bounded data-only schema without learner identity fields', function () {
  const storage = makeStorage();
  progress.recordAttempt(attempt(), storage);
  const backup = progress.exportData(storage);
  assert.equal(backup.app, 'ct-edu-local-progress');
  assert.equal(backup.version, 1);
  assert.ok(Number.isInteger(backup.exportedAt));
  assert.equal(backup.attempts.length, 1);
  assert.equal('userId' in backup.attempts[0], false);
  assert.equal('email' in backup.attempts[0], false);
});

test('valid backup replaces local history with normalized records', function () {
  const storage = makeStorage();
  progress.recordAttempt(attempt({ targetId: 'old-structure' }), storage);
  const backup = {
    app: 'ct-edu-local-progress',
    version: 1,
    exportedAt: 1700000009000,
    attempts: [
      attempt({ targetId: 'liver', selectedId: 'liver', isCorrect: true }),
      attempt({ targetId: 'spleen', selectedId: 'aorta', isCorrect: false, timestamp: 1700000001000 })
    ]
  };
  const result = progress.importData(backup, storage);
  assert.deepEqual(result, { imported: true, count: 2, truncated: false, reason: null });
  assert.deepEqual(progress.getSummary(storage), {
    available: true,
    totalAttempts: 2,
    correctAttempts: 1,
    accuracy: 50,
    distinctStructures: 2,
    lastAttemptAt: 1700000001000
  });
});

test('invalid backup and invalid records are rejected without replacing saved history', function () {
  const storage = makeStorage();
  progress.recordAttempt(attempt(), storage);
  const before = storage.raw(progress.storageKey);
  assert.equal(progress.importData({ app: 'other-app', version: 1, attempts: [] }, storage).reason, 'invalid-backup');
  assert.equal(progress.importData({ app: 'ct-edu-local-progress', version: 7, attempts: [] }, storage).reason, 'invalid-backup');
  assert.equal(progress.importData({ app: 'ct-edu-local-progress', version: 1, attempts: [ { targetId: 'incomplete' } ] }, storage).reason, 'invalid-attempt');
  assert.equal(storage.raw(progress.storageKey), before);
  assert.equal(progress.getSummary(storage).totalAttempts, 1);
});

test('oversized attempt arrays import only the most recent retained records', function () {
  const storage = makeStorage();
  const attempts = Array.from({ length: progress.maxAttempts + 4 }, function (_, index) {
    return attempt({ targetId: 'structure-' + index, selectedId: 'structure-' + index, timestamp: 1700000000000 + index });
  });
  const result = progress.importData({ app: 'ct-edu-local-progress', version: 1, attempts: attempts }, storage);
  assert.deepEqual(result, { imported: true, count: progress.maxAttempts, truncated: true, reason: null });
  const restored = JSON.parse(storage.raw(progress.storageKey)).attempts;
  assert.equal(restored.length, progress.maxAttempts);
  assert.equal(restored[0].targetId, 'structure-4');
  assert.equal(restored[restored.length - 1].targetId, 'structure-503');
});

test('backup import reports quota/write failures without throwing', function () {
  const blocked = {
    getItem: function () { return null; },
    setItem: function () { throw new Error('quota exceeded'); },
    removeItem: function () {},
  };
  const backup = { app: 'ct-edu-local-progress', version: 1, attempts: [attempt()] };
  assert.equal(progress.importData(backup, blocked).reason, 'storage-write-failed');
});
