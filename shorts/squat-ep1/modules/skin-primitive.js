// 장면 모듈: 기본 피부 공급자. 피부, 머리카락, 얼굴, 옷을 관절에 붙인다.
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.PrimitiveSkin = api;
})(this, function () {
  const THREE_CTORS = ['Mesh', 'MeshStandardMaterial', 'SphereGeometry', 'CapsuleGeometry', 'TorusGeometry'];
  const STYLE_PATHS = [
    'skin.color', 'skin.roughness', 'hair.color', 'hair.roughness',
    'face.eyeColor', 'face.mouthColor', 'face.expression',
    'top.color', 'top.roughness', 'bottom.color', 'bottom.roughness',
    'xray.baseOpacity', 'xray.overlayOpacity',
  ];

  function validate(THREE, joints, style) {
    if (!THREE) throw new TypeError('THREE is required');
    for (const n of THREE_CTORS) {
      if (typeof THREE[n] !== 'function') throw new TypeError(`THREE.${n} is required`);
    }
    if (!joints) throw new TypeError('joints is required');
    const need = (obj, p) => { if (!obj) throw new TypeError(`missing ${p}`); };
    need(joints.pelvis, 'joints.pelvis');
    need(joints.upper, 'joints.upper');
    for (let i = 0; i < 2; i++) {
      need(joints.arms && joints.arms[i], `joints.arms[${i}]`);
      const l = joints.legs && joints.legs[i];
      need(l, `joints.legs[${i}]`);
      for (const k of ['hip', 'thigh', 'knee']) need(l[k], `joints.legs[${i}].${k}`);
    }
    if (!style) throw new TypeError('style is required');
    for (const p of STYLE_PATHS) {
      const [g, k] = p.split('.');
      if (!style[g] || style[g][k] === undefined) throw new TypeError(`missing style.${p}`);
    }
  }

  function build(THREE, joints, style) {
    validate(THREE, joints, style);

    const meshes = [];
    const attached = [];
    const geometries = new Set();
    const mat = (color, roughness) => new THREE.MeshStandardMaterial({ color, roughness, transparent: true });
    const m = {
      skin: mat(style.skin.color, style.skin.roughness),
      hair: mat(style.hair.color, style.hair.roughness),
      eye: mat(style.face.eyeColor, 0.4),
      mouth: mat(style.face.mouthColor, 0.6),
      top: mat(style.top.color, style.top.roughness),
      bottom: mat(style.bottom.color, style.bottom.roughness),
    };
    const baseMats = [m.skin];
    const overlayMats = [m.hair, m.eye, m.mouth, m.top, m.bottom];

    function add(parent, geo, material, x, y, z, sx, sy, sz) {
      const mesh = new THREE.Mesh(geo, material);
      mesh.position.set(x, y, z);
      if (sx !== undefined) mesh.scale.set(sx, sy, sz);
      geometries.add(geo);
      meshes.push(mesh);
      attached.push([parent, mesh]);
      return mesh;
    }
    const capsule = (parent, r, len, material, x, y, z) =>
      add(parent, new THREE.CapsuleGeometry(r, len, 8, 16), material, x, y, z);
    const blob = (parent, r, sx, sy, sz, material, x, y, z) =>
      add(parent, new THREE.SphereGeometry(r, 24, 16), material, x, y, z, sx, sy, sz);

    const { pelvis, upper, arms, legs } = joints;

    // 기본 피부 14개
    capsule(upper, 0.2, 0.4, m.skin, 0, 0.55, 0);
    blob(upper, 0.14, 1.2, 0.8, 0.8, m.skin, 0, 0.92, 0);
    blob(upper, 0.12, 1, 1, 1, m.skin, 0, 1.08, 0);
    blob(upper, 0.13, 1, 1.15, 1, m.skin, 0, 1.25, 0.01); // 머리
    for (const arm of arms) {
      capsule(arm, 0.065, 0.3, m.skin, 0, -0.2, 0);
      capsule(arm, 0.055, 0.28, m.skin, 0, -0.6, 0.02);
    }
    for (const leg of legs) {
      capsule(leg.thigh, 0.1, 0.22, m.skin, 0, -0.21, 0);
      capsule(leg.knee, 0.07, 0.22, m.skin, 0, -0.2, 0);
      blob(leg.knee, 0.05, 1.4, 0.6, 2.0, m.skin, 0, -0.44, 0.06); // 발
    }

    // 머리카락: 머리 위 반구
    add(upper, new THREE.SphereGeometry(0.14, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), m.hair,
      0, 1.275, -0.012, 1, 1.15, 1);

    // 눈, 입 (카메라 쪽 +z 얼굴 면)
    blob(upper, 0.016, 1, 1, 0.6, m.eye, -0.045, 1.275, 0.126);
    blob(upper, 0.016, 1, 1, 0.6, m.eye, 0.045, 1.275, 0.126);
    if (style.face.expression === 'smile') {
      const mouth = add(upper, new THREE.TorusGeometry(0.04, 0.006, 8, 16, Math.PI), m.mouth, 0, 1.2, 0.127);
      mouth.rotation.z = Math.PI; // 아래로 굽은 호
    } else {
      blob(upper, 0.03, 1, 0.25, 0.4, m.mouth, 0, 1.2, 0.127);
    }

    // 옷
    capsule(upper, 0.208, 0.4, m.top, 0, 0.55, 0);
    blob(pelvis, 0.15, 2.0, 1.1, 1.1, m.bottom, 0, -0.05, -0.08);
    for (const leg of legs) capsule(leg.thigh, 0.108, 0.02, m.bottom, 0, -0.07, 0);

    // 검사를 모두 마친 뒤 붙인다
    for (const [parent, mesh] of attached) parent.add(mesh);

    let disposed = false;
    const all = [...baseMats, ...overlayMats];

    function setXray(on) {
      if (disposed) throw new Error('skin disposed');
      if (typeof on !== 'boolean') throw new TypeError('setXray: boolean required');
      const apply = (material, opacity) => {
        material.opacity = on ? opacity : 1.0;
        material.depthWrite = !on;
        material.transparent = true;
        material.needsUpdate = true;
      };
      for (const x of baseMats) apply(x, style.xray.baseOpacity);
      for (const x of overlayMats) apply(x, style.xray.overlayOpacity);
    }

    function dispose() {
      if (disposed) return;
      disposed = true;
      for (const mesh of meshes) if (mesh.parent) mesh.parent.remove(mesh);
      geometries.forEach((g) => g.dispose());
      all.forEach((x) => x.dispose());
    }

    return Object.freeze({ meshes: Object.freeze(meshes), setXray, dispose });
  }

  return Object.freeze({ build });
});
