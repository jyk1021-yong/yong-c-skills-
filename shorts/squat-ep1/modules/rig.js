// 장면 모듈: 뼈대(관절 그룹)와 근육 생성, 자세와 활성도 적용. THREE는 인자로 받는다.
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.SquatRig = api;
})(this, function () {
  const MUSCLE_COLORS = Object.freeze({
    glute: 0x3b82f6, quad: 0xef4444, hams: 0xf97316, calf: 0x22c55e, core: 0xfacc15, chest: 0xf43f5e,
  });

  function buildRig(THREE) {
    if (!THREE || typeof THREE.Group !== 'function' || typeof THREE.Mesh !== 'function') {
      throw new TypeError('buildRig: THREE with Group and Mesh is required');
    }

    const muscleMats = {};
    for (const k of Object.keys(MUSCLE_COLORS)) {
      muscleMats[k] = new THREE.MeshStandardMaterial({
        color: MUSCLE_COLORS[k], emissive: MUSCLE_COLORS[k], emissiveIntensity: 0.1, roughness: 0.5,
      });
    }

    function blob(r, sx, sy, sz, mat, x, y, z) {
      const m = new THREE.Mesh(new THREE.SphereGeometry(r, 24, 16), mat);
      m.scale.set(sx, sy, sz);
      m.position.set(x, y, z);
      return m;
    }

    const root = new THREE.Group();
    const pelvis = new THREE.Group();
    pelvis.position.y = 1.0;
    root.add(pelvis);
    const upper = new THREE.Group();
    pelvis.add(upper);

    const muscles = [];
    function addMuscle(parent, key, mesh) {
      parent.add(mesh);
      muscles.push({ mesh, key });
    }

    // 가슴, 복근
    addMuscle(upper, 'chest', blob(0.09, 1.3, 0.8, 0.6, muscleMats.chest, -0.1, 0.7, 0.17));
    addMuscle(upper, 'chest', blob(0.09, 1.3, 0.8, 0.6, muscleMats.chest, 0.1, 0.7, 0.17));
    addMuscle(upper, 'core', blob(0.1, 0.6, 1.5, 0.3, muscleMats.core, 0, 0.45, 0.16));

    // 팔 (어깨 기준 회전)
    const arms = [];
    for (const side of [-1, 1]) {
      const arm = new THREE.Group();
      arm.position.set(side * 0.3, 0.85, 0);
      upper.add(arm);
      arms.push(arm);
    }

    // 다리 (좌우)
    const legs = [];
    for (const side of [-1, 1]) {
      const hip = new THREE.Group();
      hip.position.set(side * 0.13, -0.08, 0);
      pelvis.add(hip);

      addMuscle(pelvis, 'glute', blob(0.13, 1, 0.9, 0.9, muscleMats.glute, side * 0.14, -0.05, -0.08));

      const thigh = new THREE.Group();
      hip.add(thigh);
      addMuscle(thigh, 'quad', blob(0.085, 0.75, 1.0, 0.6, muscleMats.quad, 0, -0.2, 0.04));
      addMuscle(thigh, 'hams', blob(0.08, 0.75, 1.0, 0.6, muscleMats.hams, 0, -0.2, -0.04));

      const knee = new THREE.Group();
      knee.position.set(0, -0.42, 0);
      thigh.add(knee);
      addMuscle(knee, 'calf', blob(0.065, 0.8, 1.0, 0.8, muscleMats.calf, 0, -0.2, -0.015));

      legs.push(Object.freeze({ hip, thigh, knee }));
    }

    const joints = Object.freeze({
      pelvis, upper, arms: Object.freeze(arms), legs: Object.freeze(legs),
    });
    return { root, joints, muscles };
  }

  function applyPose(joints, pose) {
    joints.pelvis.position.y = pose.pelvisY;
    joints.pelvis.position.z = pose.pelvisZ;
    joints.upper.rotation.x = pose.lean;
    for (const leg of joints.legs) {
      leg.hip.rotation.x = pose.hip;
      leg.knee.rotation.x = pose.knee;
    }
    for (const arm of joints.arms) arm.rotation.x = pose.arm;
  }

  function applyActivation(muscles, act, pulse) {
    for (const { mesh, key } of muscles) {
      const level = act[key] ?? 0.1;
      mesh.material.emissiveIntensity = 0.1 + level * 1.4 * pulse;
    }
  }

  return Object.freeze({ MUSCLE_COLORS, buildRig, applyPose, applyActivation });
});
