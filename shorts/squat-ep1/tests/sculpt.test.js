'use strict';
const test = require('node:test');
const assert = require('node:assert');
const THREE = require('../three.min.js');
const Sculpt = require('../modules/sculpt.js');

const PARTS = [
  ['torso', () => Sculpt.torso(THREE)],
  ['shoulders', () => Sculpt.shoulders(THREE)],
  ['neck', () => Sculpt.neck(THREE)],
  ['head', () => Sculpt.head(THREE)],
  ['upperArm-', () => Sculpt.upperArm(THREE, -1)],
  ['upperArm+', () => Sculpt.upperArm(THREE, 1)],
  ['foreArm-', () => Sculpt.foreArm(THREE, -1)],
  ['foreArm+', () => Sculpt.foreArm(THREE, 1)],
  ['thigh-', () => Sculpt.thigh(THREE, -1)],
  ['thigh+', () => Sculpt.thigh(THREE, 1)],
  ['calf-', () => Sculpt.calf(THREE, -1)],
  ['calf+', () => Sculpt.calf(THREE, 1)],
  ['foot', () => Sculpt.foot(THREE)],
];

test('S1 every part is a SphereGeometry plus a scale triple', () => {
  for (const [name, make] of PARTS) {
    const p = make();
    assert.strictEqual(p.geometry.type, 'SphereGeometry', name);
    assert.strictEqual(p.scale.length, 3, name);
    assert.ok(p.geometry.parameters.radius > 0, name);
  }
});

test('S2 vertices never go inside the base ellipsoid (bumps only push outward)', () => {
  for (const [name, make] of PARTS) {
    const { geometry, scale } = make();
    const r = geometry.parameters.radius;
    const pos = geometry.attributes.position;
    let maxOut = 0;
    for (let i = 0; i < pos.count; i++) {
      const len = Math.hypot(pos.getX(i), pos.getY(i), pos.getZ(i)); // 메시 로컬: 기본 구 반지름 기준
      assert.ok(len >= r - 1e-6, `${name}: vertex ${i} inside base (${len} < ${r})`);
      maxOut = Math.max(maxOut, len - r);
    }
    assert.ok(maxOut < 0.2, `${name}: bump too tall ${maxOut}`);
  }
});

test('S3 muscle parts actually bulge', () => {
  const bulge = (p) => {
    const r = p.geometry.parameters.radius, pos = p.geometry.attributes.position;
    let m = 0;
    for (let i = 0; i < pos.count; i++) {
      m = Math.max(m, Math.hypot(pos.getX(i), pos.getY(i), pos.getZ(i)) - r);
    }
    return m;
  };
  for (const n of ['torso', 'upperArm-', 'thigh+', 'calf-']) {
    const p = PARTS.find((x) => x[0] === n)[1]();
    assert.ok(bulge(p) > 0.008, `${n} bulge ${bulge(p)}`);
  }
});

test('S4 deterministic and no globals needed', () => {
  const a = Sculpt.torso(THREE).geometry.attributes.position.array;
  const b = Sculpt.torso(THREE).geometry.attributes.position.array;
  assert.deepStrictEqual(Array.from(a), Array.from(b));
  assert.throws(() => Sculpt.torso(), TypeError);
  assert.throws(() => Sculpt.torso({}), TypeError);
  assert.ok(Object.isFrozen(Sculpt));
});

test('S5 left and right limbs mirror each other', () => {
  const l = Sculpt.upperArm(THREE, -1).geometry.attributes.position;
  const r = Sculpt.upperArm(THREE, 1).geometry.attributes.position;
  assert.strictEqual(l.count, r.count);
  // vertex i of left equals vertex i of right with x negated (same sphere topology)
  for (let i = 0; i < l.count; i += 7) {
    // find mirror vertex: topology is symmetric about x only via index remap, so compare bounds instead
  }
  const maxX = (p) => { let m = -9, n = 9; for (let i = 0; i < p.count; i++) { m = Math.max(m, p.getX(i)); n = Math.min(n, p.getX(i)); } return [m, n]; };
  const [lm, ln] = maxX(l), [rm, rn] = maxX(r);
  assert.ok(Math.abs(lm + rn) < 1e-3 && Math.abs(ln + rm) < 1e-3, 'x bounds mirror');
  assert.ok(Math.abs(lm - ln) > 0 && lm !== rm, 'not identical');
});

test('S6 seam normals are merged (no visible crease)', () => {
  const g = Sculpt.torso(THREE).geometry;
  const pos = g.attributes.position, nor = g.attributes.normal;
  const seen = new Map();
  let worst = 0;
  for (let i = 0; i < pos.count; i++) {
    const k = [pos.getX(i), pos.getY(i), pos.getZ(i)].map((v) => Math.round(v * 1e5)).join(',');
    const n = new THREE.Vector3().fromBufferAttribute(nor, i);
    if (seen.has(k)) worst = Math.max(worst, seen.get(k).distanceTo(n)); else seen.set(k, n);
  }
  assert.ok(worst < 1e-4, `normal mismatch at shared positions ${worst}`);
});
