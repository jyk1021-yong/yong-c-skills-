'use strict';
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const near = (a, b, msg) => assert.ok(Math.abs(a - b) < 1e-9, `${msg || ''} expected ${b}, got ${a}`);
const MOD = path.join(__dirname, '..', 'modules');
const read = (f) => fs.readFileSync(path.join(MOD, f), 'utf8');

const Q1 = '엉덩이를 뒤로 빼고, 가슴은 위로';
const Q2 = '무릎은 발끝 방향, 허리는 곧게';
const Q3 = '엉덩이로 밀어 올리기';
const Q4 = '두 발은 어깨너비, 다시 시작';

test('T0 three.min.js loads in Node (r160)', () => {
  const THREE = require('../three.min.js');
  assert.strictEqual(THREE.REVISION, '160');
});

test('T1 motion: regression table', () => {
  const M = require('../modules/motion.js');
  assert.strictEqual(M.CYCLE_MS, 3200);
  const rows = [
    [0, 0, Q1], [320, 0.1464466094, Q1], [640, 0.5, Q1],
    [1280, 1, Q2], [1600, 1, Q3], [2240, 0.5, Q3],
    [2880, 0, Q4], [3199, 0, Q4], [3200, 0, Q1], [-100, 0, Q1],
  ];
  for (const [ms, d, cue] of rows) {
    near(M.depthAt(ms), d, `depthAt(${ms})`);
    assert.strictEqual(M.cueAt(ms), cue, `cueAt(${ms})`);
  }
  assert.ok(M.depthAt(1279) < 1);
  assert.strictEqual(M.cueAt(1279), Q1);
  // 설계 메모는 NaN을 돌려준다고 적었으나 기존 코드는 마지막 return 0에 닿아 0을 돌려준다. 기존 동작 기준.
  assert.strictEqual(M.depthAt(NaN), 0);
});

test('T1 motion: poseAt and activationAt values', () => {
  const M = require('../modules/motion.js');
  const poses = {
    0: [1, 0, 0, 0, 0, 0],
    0.5: [0.79, -0.125, 0.15, -0.6, 0.45, -0.7],
    1: [0.58, -0.25, 0.3, -1.2, 0.9, -1.4],
  };
  const keys = ['pelvisY', 'pelvisZ', 'lean', 'hip', 'knee', 'arm'];
  for (const [d, exp] of Object.entries(poses)) {
    const p = M.poseAt(Number(d));
    keys.forEach((k, i) => near(p[k], exp[i], `poseAt(${d}).${k}`));
  }
  const acts = { 0: [0, 0, 0, 0], 0.5: [0.5, 0.5, 0.35, 0.15], 1: [1, 1, 0.7, 0.3] };
  const ak = ['glute', 'quad', 'hams', 'calf'];
  for (const [d, exp] of Object.entries(acts)) {
    const a = M.activationAt(Number(d));
    ak.forEach((k, i) => near(a[k], exp[i], `activationAt(${d}).${k}`));
  }
});

test('T1 motion: pulseAt and muscleIntensity', () => {
  const M = require('../modules/motion.js');
  near(M.pulseAt(0), 0.85);
  near(M.pulseAt(500), 0.85 + 0.15 * Math.sin(500 / 120));
  near(M.muscleIntensity(0, 1), 0.1);
  near(M.muscleIntensity(1, 1), 1.5);
  near(M.muscleIntensity(0.5, 0.85), 0.695);
});

test('T1 motion: ranges, top and bottom', () => {
  const M = require('../modules/motion.js');
  for (let ms = 0; ms <= 3200; ms += 10) {
    const d = M.depthAt(ms);
    assert.ok(d >= 0 && d <= 1, `depth ${ms}`);
    for (const v of Object.values(M.activationAt(d))) assert.ok(v >= 0 && v <= 1);
  }
  for (const ms of [0, ...Array.from({ length: 320 }, (_, i) => 2880 + i)]) {
    for (const v of Object.values(M.activationAt(M.depthAt(ms)))) assert.strictEqual(v, 0, `top ${ms}`);
  }
  for (let ms = 1280; ms < 1600; ms++) assert.strictEqual(M.depthAt(ms), 1);
});

test('T1 motion: periodicity and cue boundaries', () => {
  const M = require('../modules/motion.js');
  for (const ms of [0, 17, 333, 999, 1500, 2222, 3000, 3199]) {
    near(M.depthAt(ms), M.depthAt(ms + M.CYCLE_MS), `period ${ms}`);
    assert.strictEqual(M.cueAt(ms), M.cueAt(ms + M.CYCLE_MS));
  }
  const b = [[1279, Q1], [1280, Q2], [1599, Q2], [1600, Q3], [2879, Q3], [2880, Q4], [3199, Q4], [3200, Q1]];
  for (const [ms, cue] of b) assert.strictEqual(M.cueAt(ms), cue, `boundary ${ms}`);
});

test('T1 purity: forbidden tokens in module sources', () => {
  for (const f of ['motion.js', 'character-style.js']) {
    const s = read(f);
    for (const w of ['document', 'window', 'THREE', 'performance', 'Math.random']) {
      assert.ok(!s.includes(w), `${f} contains ${w}`);
    }
  }
  for (const f of ['rig.js', 'skin-primitive.js']) {
    const s = read(f);
    for (const w of ['document', 'window', 'performance', 'Math.random']) {
      assert.ok(!s.includes(w), `${f} contains ${w}`);
    }
  }
});
