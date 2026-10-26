'use strict';
const test = require('node:test');
const assert = require('node:assert');
const THREE = require('../three.min.js');
const Rig = require('../modules/rig.js');
const CS = require('../modules/character-style.js');
const Skin = require('../modules/skin-primitive.js');
const Sculpt = require('../modules/sculpt.js');

const setup = (over) => {
  const rig = Rig.buildRig(THREE);
  const style = CS.resolveStyle(over);
  return { rig, style, handle: Skin.build(THREE, rig.joints, style, Sculpt) };
};
const groupsOf = (j) => [j.pelvis, j.upper, ...j.arms, ...j.legs.flatMap((l) => [l.hip, l.thigh, l.knee])];
const counts = (j) => groupsOf(j).map((g) => g.children.length);
const mats = (h) => [...new Set(h.meshes.map((m) => m.material))];

test('T4 handle structure', () => {
  const { handle } = setup();
  assert.strictEqual(handle.meshes.length, 19); // 피부 14 + 눈 2 + 하의 3 (머리카락, 윗옷, 입 없음)
  assert.ok(Object.isFrozen(handle));
  assert.strictEqual(typeof handle.setXray, 'function');
  assert.strictEqual(typeof handle.dispose, 'function');
  assert.strictEqual(mats(handle).length, 3); // 피부, 눈, 하의
});

test('T4 base skin regression', () => {
  const { rig, handle } = setup();
  const j = rig.joints;
  const skinMat = handle.meshes[0].material;
  const skin = handle.meshes.filter((m) => m.material === skinMat);
  assert.strictEqual(skin.length, 14);
  const by = (g) => skin.filter((m) => m.parent === g).length;
  assert.strictEqual(by(j.upper), 4);
  for (const a of j.arms) assert.strictEqual(by(a), 2);
  for (const l of j.legs) { assert.strictEqual(by(l.thigh), 1); assert.strictEqual(by(l.knee), 2); }
  const head = skin.find((m) => m.parent === j.upper && Math.abs(m.position.y - 1.25) < 1e-9);
  assert.ok(head);
  assert.deepStrictEqual([head.position.x, head.position.y, head.position.z], [0, 1.25, 0.01]);
  assert.deepStrictEqual([head.scale.x, head.scale.y, head.scale.z], [1, 1.15, 1]);
  assert.strictEqual(skinMat.color.getHex(), 0x2f7a3e);
  assert.ok(skinMat.roughness >= 0.85, 'matte skin');
  for (const m of skin) assert.strictEqual(m.geometry.type, 'SphereGeometry');
});

test('T4 clothing: shorts only, bare torso', () => {
  const { handle, style } = setup();
  const bottom = handle.meshes.filter((m) => m.material.color.getHex() === style.bottom.color);
  assert.strictEqual(bottom.length, 3);
  assert.strictEqual(style.bottom.color, 0x1e293b); // 기존 하의 값 유지
  assert.strictEqual(handle.meshes.filter((m) => m.material.color.getHex() === style.top.color).length, 0);
});

test('T4 bottom covers glutes', () => {
  const { rig, handle, style } = setup();
  const bottomMeshes = handle.meshes.filter((m) => m.material.color.getHex() === style.bottom.color);
  const pelvisBottom = bottomMeshes.filter((m) => m.parent === rig.joints.pelvis);
  assert.strictEqual(pelvisBottom.length, 1);
  assert.strictEqual(bottomMeshes.filter((m) => m.parent !== rig.joints.pelvis).length, 2);
  rig.root.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(pelvisBottom[0]);
  for (const g of rig.muscles.filter((m) => m.key === 'glute')) {
    const gb = new THREE.Box3().setFromObject(g.mesh);
    assert.ok(box.containsBox(gb), 'bottom must contain glute box');
  }
});

test('T4 face', () => {
  const { rig, handle, style } = setup({ face: { expression: 'smile' } });
  const eyes = handle.meshes.filter((m) => m.material.color.getHex() === style.face.eyeColor);
  const mouth = handle.meshes.filter((m) => m.material.color.getHex() === style.face.mouthColor);
  assert.strictEqual(eyes.length, 2);
  assert.strictEqual(style.face.eyeColor, 0xffffff);
  assert.strictEqual(mouth.length, 1);
  for (const m of [...eyes, ...mouth]) {
    assert.strictEqual(m.parent, rig.joints.upper);
    assert.ok(m.position.z > 0.01);
  }
  const smile = mouth[0].geometry.type;
  assert.strictEqual(smile, 'TorusGeometry');
  // 기본 표정(neutral)은 눈 두 개만, 입 없음
  const d = setup();
  assert.strictEqual(d.style.face.expression, 'neutral');
  assert.strictEqual(d.handle.meshes.filter((m) => m.material.color.getHex() === d.style.face.mouthColor).length, 0);
  assert.strictEqual(d.handle.meshes.filter((m) => m.material.color.getHex() === d.style.face.eyeColor).length, 2);
});

test('T4 attachment parents are joints', () => {
  const { rig, handle } = setup();
  const gs = new Set(groupsOf(rig.joints));
  for (const m of handle.meshes) assert.ok(gs.has(m.parent));
});

test('T5 xray toggle', () => {
  const { rig, handle } = setup();
  const ms = mats(handle);
  const skinMat = handle.meshes[0].material;
  const snap = () => rig.muscles.map(({ mesh }) => [mesh.material.opacity, mesh.material.depthWrite, mesh.material.emissiveIntensity]);
  const muscleBefore = snap();
  for (const m of ms) { assert.strictEqual(m.opacity, 1); assert.strictEqual(m.depthWrite, true); assert.strictEqual(m.transparent, true); }
  handle.setXray(true);
  handle.setXray(true);
  for (const m of ms) {
    assert.strictEqual(m.depthWrite, false);
    assert.strictEqual(m.transparent, true);
    assert.strictEqual(m.opacity, m === skinMat ? 0.35 : 0.2);
  }
  assert.throws(() => handle.setXray('yes'), TypeError);
  for (const m of ms) assert.strictEqual(m.depthWrite, false);
  handle.setXray(false);
  for (const m of ms) { assert.strictEqual(m.opacity, 1); assert.strictEqual(m.depthWrite, true); assert.strictEqual(m.transparent, true); }
  assert.deepStrictEqual(snap(), muscleBefore);
});

test('T6 build failures are atomic', () => {
  const rig = Rig.buildRig(THREE);
  const j = rig.joints;
  const style = CS.resolveStyle();
  const before = counts(j);
  assert.throws(() => Skin.build(THREE, { ...j, legs: [j.legs[0]] }, style, Sculpt), (e) => e instanceof TypeError && e.message.includes('legs[1]'));
  assert.deepStrictEqual(counts(j), before);
  assert.throws(() => Skin.build(THREE, j, {}, Sculpt), TypeError);
  assert.deepStrictEqual(counts(j), before);
  assert.throws(() => Skin.build({}, j, style, Sculpt), TypeError);
  assert.deepStrictEqual(counts(j), before);
  assert.throws(() => Skin.build(THREE, j, style), (e) => e instanceof TypeError && e.message.includes('sculpt'));
  assert.deepStrictEqual(counts(j), before);
});

test('T6 dispose cleans up', () => {
  const rig = Rig.buildRig(THREE);
  const before = counts(rig.joints);
  const handle = Skin.build(THREE, rig.joints, CS.resolveStyle(), Sculpt);
  const geos = new Set(handle.meshes.map((m) => m.geometry));
  const ms = new Set(handle.meshes.map((m) => m.material));
  let g = 0, m = 0;
  geos.forEach((x) => x.addEventListener('dispose', () => g++));
  ms.forEach((x) => x.addEventListener('dispose', () => m++));
  const muscleMeshes = rig.muscles.map((x) => x.mesh);
  handle.dispose();
  assert.strictEqual(g, geos.size);
  assert.strictEqual(m, ms.size);
  for (const mesh of handle.meshes) assert.strictEqual(mesh.parent, null);
  assert.deepStrictEqual(counts(rig.joints), before);
  for (const mesh of muscleMeshes) assert.ok(mesh.parent);
  assert.doesNotThrow(() => handle.dispose());
  assert.throws(() => handle.setXray(true), /skin disposed/);
});

// X-ray 끔일 때 몸통, 다리 근육이(가슴 포함: 대흉근 봉우리가 덮는다)
// 판정은 기본 타원체(반지름) 기준이다. sculpt는 바깥쪽으로만 밀기 때문에(sculpt.test S2) 실제 피부 면은 그 바깥에 있다.
// X-ray 끔일 때 피부 안에 있어야 한다.
function insideSkin(THREE, skinMeshes, worldPoint) {
  return skinMeshes.some((s) => {
    const p = worldPoint.clone().applyMatrix4(s.matrixWorld.clone().invert());
    const g = s.geometry;
    if (g.type === 'CapsuleGeometry') {
      const { radius, length } = g.parameters;
      const half = length / 2;
      const cy = Math.max(-half, Math.min(half, p.y));
      return Math.hypot(p.x, p.y - cy, p.z) <= radius + 1e-9;
    }
    if (g.type === 'SphereGeometry') return p.length() <= g.parameters.radius + 1e-9;
    return false;
  });
}

test('T5 xray off: quad, hams, calf, core are inside the skin', () => {
  const { rig, handle } = setup();
  handle.setXray(false);
  rig.root.updateMatrixWorld(true);
  const skinMat = handle.meshes[0].material;
  const skin = handle.meshes.filter((m) => m.material === skinMat);
  for (const key of ['quad', 'hams', 'calf', 'core']) {
    for (const { mesh } of rig.muscles.filter((x) => x.key === key)) {
      const pos = mesh.geometry.attributes.position;
      let outside = 0;
      for (let i = 0; i < pos.count; i++) {
        const w = new THREE.Vector3().fromBufferAttribute(pos, i).applyMatrix4(mesh.matrixWorld);
        if (!insideSkin(THREE, skin, w)) outside++;
      }
      assert.strictEqual(outside, 0, `${key}: ${outside} vertices outside skin`);
    }
  }
});

// 가슴 근육은 기본 타원체 밖으로 나가고 대흉근 봉우리가 덮는다. 기본 구 판정이 안 맞으므로 실제 정점 면으로 쏴서 확인한다.
test('T5 xray off: chest is under the sculpted pec surface', () => {
  const { rig, handle } = setup();
  handle.setXray(false);
  rig.root.updateMatrixWorld(true);
  const torso = handle.meshes.find((m) => m.parent === rig.joints.upper && Math.abs(m.position.y - 0.55) < 1e-9);
  const side = torso.material.side;
  torso.material.side = THREE.DoubleSide;
  const center = new THREE.Vector3().setFromMatrixPosition(torso.matrixWorld);
  let outside = 0;
  for (const { mesh } of rig.muscles.filter((x) => x.key === 'chest')) {
    const pos = mesh.geometry.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const w = new THREE.Vector3().fromBufferAttribute(pos, i).applyMatrix4(mesh.matrixWorld);
      const dir = w.clone().sub(center);
      const dist = dir.length();
      const hits = new THREE.Raycaster(center, dir.normalize()).intersectObject(torso);
      if (!hits.length || hits[hits.length - 1].distance < dist) outside++;
    }
  }
  torso.material.side = side;
  assert.strictEqual(outside, 0, `chest: ${outside} vertices outside skin`);
});
