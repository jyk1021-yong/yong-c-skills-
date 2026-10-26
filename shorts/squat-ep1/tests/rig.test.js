'use strict';
const test = require('node:test');
const assert = require('node:assert');
const THREE = require('../three.min.js');
const Rig = require('../modules/rig.js');
const M = require('../modules/motion.js');

const near = (a, b, msg) => assert.ok(Math.abs(a - b) < 1e-9, `${msg || ''} expected ${b}, got ${a}`);

test('T3 buildRig structure and hierarchy', () => {
  const rig = Rig.buildRig(THREE);
  const { root, joints, muscles } = rig;
  assert.ok(root && joints && muscles);
  assert.strictEqual(joints.pelvis.parent, root);
  assert.strictEqual(joints.upper.parent, joints.pelvis);
  assert.strictEqual(joints.arms.length, 2);
  assert.strictEqual(joints.legs.length, 2);
  for (let i = 0; i < 2; i++) {
    assert.strictEqual(joints.arms[i].parent, joints.upper);
    const l = joints.legs[i];
    assert.strictEqual(l.hip.parent, joints.pelvis);
    assert.strictEqual(l.thigh.parent, l.hip);
    assert.strictEqual(l.knee.parent, l.thigh);
  }
  assert.strictEqual(joints.pelvis.position.y, 1.0);
  assert.strictEqual(joints.arms[0].position.x, -0.3);
  assert.strictEqual(joints.arms[1].position.x, 0.3);
  assert.strictEqual(joints.arms[0].position.y, 0.85);
  assert.strictEqual(joints.legs[0].hip.position.x, -0.13);
  assert.strictEqual(joints.legs[1].hip.position.x, 0.13);
  assert.strictEqual(joints.legs[0].hip.position.y, -0.08);
  assert.strictEqual(joints.legs[0].knee.position.y, -0.42);
  assert.ok(Object.isFrozen(joints));
});

test('T3 muscles: 11 with expected counts, only muscle materials', () => {
  const { root, muscles } = Rig.buildRig(THREE);
  assert.strictEqual(muscles.length, 11);
  const counts = {};
  for (const m of muscles) counts[m.key] = (counts[m.key] || 0) + 1;
  assert.deepStrictEqual(counts, { chest: 2, core: 1, glute: 2, quad: 2, hams: 2, calf: 2 });
  assert.deepStrictEqual(Object.keys(Rig.MUSCLE_COLORS).sort(), ['calf', 'chest', 'core', 'glute', 'hams', 'quad']);
  assert.strictEqual(Rig.MUSCLE_COLORS.glute, 0x3b82f6);
  const muscleMeshes = new Set(muscles.map((m) => m.mesh));
  let meshCount = 0;
  root.traverse((o) => {
    if (o.isMesh) { meshCount++; assert.ok(muscleMeshes.has(o), 'non-muscle mesh in rig'); }
  });
  assert.strictEqual(meshCount, 11);
});

test('T3 applyPose at depth 1', () => {
  const { joints } = Rig.buildRig(THREE);
  Rig.applyPose(joints, M.poseAt(1));
  near(joints.pelvis.position.y, 0.58);
  near(joints.pelvis.position.z, -0.25);
  near(joints.upper.rotation.x, 0.3);
  for (const l of joints.legs) { near(l.hip.rotation.x, -1.2); near(l.knee.rotation.x, 0.9); }
  for (const a of joints.arms) near(a.rotation.x, -1.4);
});

test('T3 applyActivation at depth 1', () => {
  const { muscles } = Rig.buildRig(THREE);
  Rig.applyActivation(muscles, M.activationAt(1), 1);
  for (const { mesh, key } of muscles) {
    const exp = key === 'chest' || key === 'core' ? 0.24 : key === 'hams' ? 0.1 + 0.7 * 1.4 : key === 'calf' ? 0.1 + 0.3 * 1.4 : 1.5;
    near(mesh.material.emissiveIntensity, exp, key);
  }
});

test('T3 buildRig rejects bad THREE', () => {
  assert.throws(() => Rig.buildRig({}), TypeError);
});
