const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const registryPath = path.join(root, 'docs', 'SEGMENTOR_COVERAGE_REGISTRY.json');
const registry = JSON.parse(fs.readFileSync(registryPath, 'utf8'));

test('coverage registry is versioned and matches pinned TotalSegmentator v2.11.0 total class map', function () {
  assert.equal(registry.schemaVersion, 1);
  assert.equal(registry.upstreamSources.pinnedVersion, '2.11.0');
  assert.equal(registry.upstreamSources.currentMainTask, 'total');
  assert.equal(registry.structures.length, 117);
  assert.equal(registry.upstreamSources.taskVersionIsPinned, true);
  const labelIds = registry.structures.map(function (item) { return item.upstreamLabelId; }).sort(function (a, b) { return a - b; });
  assert.deepEqual(labelIds, Array.from({ length: 117 }, function (_, i) { return i + 1; }));
  const stableIds = registry.structures.map(function (item) { return item.id; });
  assert.equal(new Set(stableIds).size, stableIds.length);
});

test('only the four current SPL predictions are marked technically validated and their limits remain explicit', function () {
  const generated = registry.structures.filter(function (item) { return item.predictionStatus === 'prediction-generated'; });
  assert.deepEqual(generated.map(function (item) { return item.upstreamModelClass; }).sort(),
    ['kidney_left', 'kidney_right', 'liver', 'spleen']);
  for (const item of generated) {
    assert.equal(item.implementationStatus, 'technically-validated');
    assert.equal(item.technicalValidation.status, 'passed-for-software-and-geometry-only');
    assert.match(item.technicalValidation.scope, /not establish anatomical correctness/i);
    assert.equal(item.evaluation.status, 'same-volume-reference-comparison-only');
    assert.equal(item.evaluation.independentHeldOutEvaluationStatus, 'not-evaluated');
    assert.equal(item.anatomicalReviewStatus, 'not-reviewed');
    assert.equal(item.educationalApprovalStatus, 'not-approved');
    assert.ok(Number.isFinite(item.evaluation.dice));
  }
  const pending = registry.structures.filter(function (item) { return item.predictionStatus === 'not-generated-in-CT-Edu'; });
  assert.equal(pending.length, 113);
  for (const item of pending) {
    assert.equal(item.implementationStatus, 'model-available-not-evaluated');
    assert.equal(item.evaluation.status, 'not-evaluated');
    assert.equal(item.technicalValidation.status, 'not-run');
  }
});

test('specialist task registry distinguishes open tasks from licensed candidates', function () {
  const tasks = Object.fromEntries(registry.taskCatalog.map(function (task) { return [task.task, task]; }));
  assert.equal(tasks.total.licensing.taskLicense, 'Apache-2.0');
  assert.equal(tasks.lung_vessels.licensing.taskLicense, 'Apache-2.0');
  assert.equal(tasks.headneck_bones_vessels.licensing.taskLicense, 'Apache-2.0');
  assert.equal(tasks.liver_vessels.licensing.taskLicense, 'Apache-2.0');
  for (const taskName of ['lung_vessels', 'headneck_bones_vessels', 'liver_vessels']) {
    assert.equal(tasks[taskName].status, 'implemented-cli-not-run');
    assert.equal(tasks[taskName].execution.cliSupported, true);
    assert.equal(tasks[taskName].execution.executionStatus, 'not-run');
  }
  assert.match(tasks.heartchambers_highres.licensing.taskLicense, /license-required/i);
  assert.match(tasks.coronary_arteries.licensing.taskLicense, /license-required/i);
  assert.equal(tasks.heartchambers_highres.execution.requestedByCTEdu, false);
  assert.equal(tasks.coronary_arteries.execution.requestedByCTEdu, false);
  assert.equal(registry.safetyAndInterpretation.originalSourceLabelMapPreserved, true);
  assert.equal(registry.safetyAndInterpretation.diagnosticUse, false);
  assert.equal(registry.safetyAndInterpretation.publicReleaseGate, 'unchanged-and-closed-unless-explicitly-approved');
});


test('coverage registry tracks current provenance safeguards without overstating external validation', function () {
  assert.equal(registry.repositoryBaseline.branch, 'main');
  assert.equal(registry.repositoryBaseline.commit, '7a69e9f1a63738d4b55f934aee886e91f9f3564a');
  assert.equal(registry.currentInferenceConfiguration.sourceInputHashesAvailableOnMain, false,
    'generator code has hash support, but the committed preview manifest still needs regeneration');
  assert.match(registry.currentInferenceConfiguration.note, /currently committed preview manifest has not yet been regenerated/i);
  const generator = fs.readFileSync(path.join(root, 'scripts', 'generate_major_organ_masks.py'), 'utf8');
  assert.match(generator, /ctNrrdSha256/);
  assert.match(generator, /labelMapNrrdSha256/);
  assert.match(generator, /publish_directory\(output, destination\)/);
  assert.match(registry.currentInferenceConfiguration.note, /atomic/i);
  assert.equal(registry.externalInferenceUtility.status, 'implemented-total-and-open-specialist-task-cli-no-external-cohort-yet');
  assert.equal(registry.externalInferenceUtility.scriptPath, 'scripts/infer_external_ct_volume.py');
  assert.equal(registry.externalInferenceUtility.arbitraryCtUploadSupported, false);
  assert.equal(registry.externalInferenceUtility.externalCohortCasesProcessed, 0);
  assert.equal(registry.externalInferenceUtility.independentEvaluationStatus, 'runner-implemented-CTORG-real-data-run-pending');
  assert.equal(registry.externalInferenceUtility.educationalApprovalStatus, 'not-approved');
  assert.equal(registry.externalInferenceUtility.selectableTotalTaskClassCount, 117);
  assert.equal(registry.externalInferenceUtility.externalCohortCasesProcessed, 0);
  assert.equal(registry.externalInferenceUtility.independentEvaluationStatus, 'runner-implemented-CTORG-real-data-run-pending');
  assert.equal(registry.externalValidationRunner.status, 'implemented-manual-workflow-not-run-on-real-data');
  assert.equal(registry.externalValidationRunner.realDataWorkflowRunsCompleted, 0);
  assert.equal(registry.externalValidationRunner.externalCasesEvaluated, 0);
  assert.equal(registry.externalValidationRunner.vesselValidationSupported, false);
  assert.equal(registry.externalValidationRunner.permittedCaseNumbers.min, 0);
  assert.equal(registry.externalValidationRunner.permittedCaseNumbers.max, 20);
  assert.deepEqual(registry.externalValidationRunner.selectableWorkflowModes, ['pilot-2', 'official-test-21']);
  assert.equal(registry.externalValidationRunner.reportOnlyArtifacts, true);
  assert.equal(registry.externalValidationRunner.sourceImagesOrMasksPublished, false);
  assert.equal(registry.externalInferenceUtility.specialistTaskSelection.sourceOfTruth,
    'docs/SEGMENTOR_COVERAGE_REGISTRY.json#taskCatalog');
  assert.deepEqual(registry.externalInferenceUtility.specialistTaskSelection.enabledTasks.map(t => t.task),
    ['lung_vessels', 'headneck_bones_vessels', 'liver_vessels']);
  assert.deepEqual(registry.externalInferenceUtility.specialistTaskSelection.blockedTasks.map(t => t.task),
    ['heartchambers_highres', 'coronary_arteries', 'brain_structures']);
  assert.equal(registry.externalInferenceUtility.specialistTaskSelection.outputsRemainUnreviewed, true);
  assert.deepEqual(registry.externalInferenceUtility.classSelection.selectionModes,
    ['upstream-class-name', 'stable-anatomy-id', 'all']);
  assert.deepEqual(registry.externalInferenceUtility.classSelection.defaultClasses,
    ['liver', 'spleen', 'kidney_right', 'kidney_left']);
  assert.match(registry.externalInferenceUtility.notes.join(' '), /Three open specialist tasks .* remain unrun in CT Edu/i);
  assert.match(registry.externalInferenceUtility.notes.join(' '), /real-data workflow has not been dispatched/i);
  assert.match(registry.externalInferenceUtility.notes.join(' '), /it provides no vessel evaluation/i);
  assert.match(fs.readFileSync(path.join(root, 'docs', 'SEGMENTOR_COVERAGE_REGISTRY.md'), 'utf8'),
    /No independent external cohort has been processed by this CLI/i);
  assert.match(fs.readFileSync(path.join(root, 'docs', 'SEGMENTOR_COVERAGE_REGISTRY.md'), 'utf8'),
    /--classes all/);
  assert.match(fs.readFileSync(path.join(root, 'docs', 'SEGMENTOR_COVERAGE_REGISTRY.md'), 'utf8'),
    /CT-ORG held-out validation runner/i);
});

test('human-readable coverage registry clearly separates upstream classes from validated output', function () {
  const markdown = fs.readFileSync(path.join(root, 'docs', 'SEGMENTOR_COVERAGE_REGISTRY.md'), 'utf8');
  assert.match(markdown, /117 named classes/i);
  assert.match(markdown, /generates only 4/i);
  assert.match(markdown, /not independent held-out evaluation/i);
  assert.match(markdown, /not confirmed HU/i);
  assert.match(markdown, /approved for educational use/i);
  assert.match(markdown, /coronary_arteries/);
});
