const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const root = path.resolve(__dirname, '..');
const read = function (name) { return fs.readFileSync(path.join(root, name), 'utf8'); };

test('calibration comparison keeps candidates explicit and never claims that model scores establish HU', function () {
  const runner = read('scripts/compare_spl_intensity_preprocessing.py');
  const utils = read('scripts/intensity_experiment_utils.py');
  const workflow = read('.github/workflows/segmentor-intensity-calibration.yml');
  const doc = read('docs/SEGMENTOR_INTENSITY_CALIBRATION_EXPERIMENT.md');
  assert.match(runner, /parse_candidate_offsets/);
  assert.match(runner, /calibrationDecision.*not-established/s);
  assert.match(runner, /diceAgainstBundledAtlasLabel/);
  assert.match(runner, /differentVoxelCount/);
  assert.match(runner, /interpretationLimits/);
  assert.match(runner, /TotalSegmentator.*--fast/s);
  assert.match(runner, /mask.*not.*independent|same-volume technical/s);
  assert.match(utils, /at least two distinct candidate offsets/i);
  assert.match(workflow, /TotalSegmentator==2\.11\.0/);
  assert.match(workflow, /--offsets.*0,1024/);
  assert.match(workflow, /if: always\(\)/);
  assert.match(workflow, /upload-artifact@/);
  assert.match(doc, /does not conclusively establish HU calibration/);
  assert.match(doc, /not automatic grounds to choose an offset/);
});

test('candidate offset parser rejects ambiguous input and accepts only at least two unique finite values', function () {
  const result = spawnSync('python3', ['-c', [
    'import sys',
    'sys.path.insert(0, sys.argv[1])',
    'from intensity_experiment_utils import parse_candidate_offsets',
    'assert parse_candidate_offsets("0, 1024") == [0.0, 1024.0]',
    'assert parse_candidate_offsets("-10.5, 1024") == [-10.5, 1024.0]',
    'for invalid in ("", "1024", "0,0", "0,nan", "0,inf", "0,10001", "0,,1024"):',
    '    try:',
    '        parse_candidate_offsets(invalid)',
    '    except ValueError:',
    '        pass',
    '    else:',
    '        raise AssertionError("accepted invalid offset list: " + invalid)',
  ].join('\n'), path.join(root, 'scripts')], { encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr || result.stdout);
});
