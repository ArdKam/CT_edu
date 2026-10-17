const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const root = path.resolve(__dirname, '..');
const runPython = function (source, args) {
  const result = spawnSync('python3', ['-c', source, ...args], { encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr || result.stdout || 'Python helper failed');
};

const makeTemp = function (t) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ctedu-segmentor-artifacts-'));
  t.after(function () { fs.rmSync(dir, { recursive: true, force: true }); });
  return dir;
};

test('segmentation output publication replaces old assets only after a complete stage exists', function (t) {
  const dir = makeTemp(t);
  fs.mkdirSync(path.join(dir, 'stage'));
  fs.mkdirSync(path.join(dir, 'target'));
  fs.writeFileSync(path.join(dir, 'stage', 'manifest.json'), '{"status":"complete"}\n');
  fs.writeFileSync(path.join(dir, 'stage', 'mask.nii.gz'), 'new-mask');
  fs.writeFileSync(path.join(dir, 'target', 'manifest.json'), '{"status":"previous"}\n');
  fs.writeFileSync(path.join(dir, 'target', 'old-mask.nii.gz'), 'previous-mask');

  const source = [
    'import sys',
    'from pathlib import Path',
    'sys.path.insert(0, sys.argv[1])',
    'from atomic_artifact_publish import publish_directory',
    'root = Path(sys.argv[2])',
    "publish_directory(root / 'stage', root / 'target')",
    "assert (root / 'target' / 'manifest.json').read_text().strip() == '{\"status\":\"complete\"}'",
    "assert (root / 'target' / 'mask.nii.gz').read_text() == 'new-mask'",
    "assert not (root / 'target' / 'old-mask.nii.gz').exists()",
    "assert not list(root.glob('.target.backup-*'))",
    "assert not (root / 'stage').exists()",
  ].join('\n');

  runPython(source, [path.join(root, 'scripts'), dir]);
});

test('failed staged publication restores the existing segmentation directory', function (t) {
  const dir = makeTemp(t);
  const helperPath = path.join(root, 'scripts');
  fs.mkdirSync(path.join(dir, 'stage'));
  fs.mkdirSync(path.join(dir, 'target'));
  fs.writeFileSync(path.join(dir, 'stage', 'manifest.json'), '{"status":"new"}\n');
  fs.writeFileSync(path.join(dir, 'target', 'manifest.json'), '{"status":"trusted-prior"}\n');
  fs.writeFileSync(path.join(dir, 'target', 'mask.nii.gz'), 'prior-mask');

  const source = [
    'import sys',
    'from pathlib import Path',
    'sys.path.insert(0, sys.argv[1])',
    'import atomic_artifact_publish as module',
    'root = Path(sys.argv[2])',
    'stage = root / "stage"',
    'target = root / "target"',
    'real_replace = module.os.replace',
    'def fail_install(src, dst):',
    '    if Path(src) == stage:',
    '        raise OSError("simulated stage install failure")',
    '    return real_replace(src, dst)',
    'module.os.replace = fail_install',
    'try:',
    '    module.publish_directory(stage, target)',
    'except OSError as error:',
    '    assert "simulated stage install failure" in str(error)',
    'else:',
    '    raise AssertionError("expected simulated publication failure")',
    'assert (target / "manifest.json").read_text().strip() == \'{"status":"trusted-prior"}\'',
    'assert (target / "mask.nii.gz").read_text() == "prior-mask"',
    'assert not list(root.glob(".target.backup-*"))',
  ].join('\n');

  runPython(source, [helperPath, dir]);
});

test('inference requires the intensity offset to be supplied explicitly', function () {
  const generator = fs.readFileSync(path.join(root, 'scripts/generate_major_organ_masks.py'), 'utf8');
  assert.match(generator, /add_argument\(\s*"--intensity-offset", type=float, required=True/);
  assert.match(generator, /publish_directory\(output, destination\)/);
  assert.match(generator, /ctNrrdSha256/);
  assert.match(generator, /labelMapNrrdSha256/);
});
