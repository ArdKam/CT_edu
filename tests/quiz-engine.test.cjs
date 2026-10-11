const test = require('node:test');
const assert = require('node:assert/strict');
const anatomy = require('../src/data/anatomy.js');
const quiz = require('../src/quiz/quiz-engine.js');

test('anatomy catalogue has unique identifiers and bilingual labels', function () {
  const ids = anatomy.items.map(function (item) { return item.id; });
  assert.equal(new Set(ids).size, ids.length);
  assert.ok(ids.length >= 8);
  anatomy.items.forEach(function (item) { assert.ok(item.nameEn && item.nameFa && item.color && item.descriptionEn && item.descriptionFa); });
});

test('search matches English, Persian, and aliases without mutating catalogue', function () {
  const count = anatomy.items.length;
  assert.equal(anatomy.search('liver').some(function (item) { return item.id === 'liver'; }), true);
  assert.equal(anatomy.search('کبد').some(function (item) { return item.id === 'liver'; }), true);
  assert.equal(anatomy.search('IVC').some(function (item) { return item.id === 'ivc'; }), true);
  assert.equal(anatomy.items.length, count);
});

test('quiz question has four unique options including target', function () {
  const question = quiz.createQuestion(anatomy.items, 'liver', function () { return 0.37; });
  assert.equal(question.options.length, 4);
  assert.equal(new Set(question.options.map(function (option) { return option.id; })).size, 4);
  assert.ok(question.options.some(function (option) { return option.id === question.id; }));
  assert.notEqual(question.id, 'liver');
});

test('answer evaluation accepts one answer and blocks repeated answers', function () {
  const question = quiz.createQuestion(anatomy.items, null, function () { return 0.22; });
  assert.deepEqual(quiz.evaluateAnswer(question, question.id), { correct: true, accepted: true });
  question.answered = true;
  assert.deepEqual(quiz.evaluateAnswer(question, question.id), { correct: false, accepted: false });
});

test('quiz refuses fewer than four structures', function () {
  assert.throws(function () { quiz.createQuestion(anatomy.items.slice(0, 3)); }, /at least four/);
});
