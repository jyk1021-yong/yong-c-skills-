// 장면 모듈: 근육질 피부 공급자. 조각한 피부(sculpt), 얼굴(눈), 반바지를 관절에 붙인다.
// sculpt 모듈은 화면이 넘겨준다(모듈끼리 직접 부르지 않는다).
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.PrimitiveSkin = api;
})(this, function () {
  const THREE_CTORS = ['Mesh', 'MeshStandardMaterial', 'SphereGeometry', 'CapsuleGeometry', 'TorusGeometry'];
  const STYLE_PATHS = [
    'skin.color', 'skin.roughness',
    'face.eyeColor', 'face.mouthColor', 'face.expression',
    'bottom.color', 'bottom.roughness',
    'xray.baseOpacity', 'xray.overlayOpacity',
  ];

  function validate(THREE, joints, style, sculpt) {
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
    if (!sculpt) throw new TypeError('sculpt is required');
    for (const n of ['torso', 'shoulders', 'neck', 'head', 'upperArm', 'foreArm', 'thigh', 'calf', 'foot']) {
      if (typeof sculpt[n] !== 'function') throw new TypeError(`sculpt.${n} is required`);
    }
  }

  function build(THREE, joints, style, sculpt) {
    validate(THREE, joints, style, sculpt);

    const meshes = [];
    const attached = [];
    const geometries = new Set();
    const mat = (color, roughness) => new THREE.MeshStandardMaterial({ color, roughness, transparent: true });
    const smile = style.face.expression === 'smile';
    const m = {
      skin: mat(style.skin.color, style.skin.roughness),
      eye: mat(style.face.eyeColor, 0.4),
      bottom: mat(style.bottom.color, style.bottom.roughness),
    };
    if (smile) m.mouth = mat(style.face.mouthColor, 0.6);
    const baseMats = [m.skin];
    const overlayMats = [m.eye, m.bottom, ...(smile ? [m.mouth] : [])];

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
    // sculpt 부위({ geometry, scale })를 피부로 붙인다
    const skinPart = (parent, part, x, y, z) => add(parent, part.geometry, m.skin, x, y, z, ...part.scale);

    const { pelvis, upper, arms, legs } = joints;

    // 피부 14개: 몸통 4(몸통, 어깨, 목, 머리), 팔 2x2, 다리 2x3
    skinPart(upper, sculpt.torso(THREE), 0, 0.55, 0);
    skinPart(upper, sculpt.shoulders(THREE), 0, 0.9, 0);
    skinPart(upper, sculpt.neck(THREE), 0, 1.08, 0);
    skinPart(upper, sculpt.head(THREE), 0, 1.25, 0.01); // 머리
    arms.forEach((arm, i) => {
      const side = i === 0 ? -1 : 1;
      // 팔 중심을 몸 바깥쪽으로 조금 비켜 몸통과 갈라 보이게 한다
      skinPart(arm, sculpt.upperArm(THREE, side), side * 0.03, -0.2, 0);
      skinPart(arm, sculpt.foreArm(THREE, side), side * 0.03, -0.6, 0.02);
    });
    legs.forEach((leg, i) => {
      const side = i === 0 ? -1 : 1;
      skinPart(leg.thigh, sculpt.thigh(THREE, side), 0, -0.2, 0);
      skinPart(leg.knee, sculpt.calf(THREE, side), 0, -0.19, 0);
      skinPart(leg.knee, sculpt.foot(THREE), 0, -0.44, 0.06); // 발
    });

    // 눈: 흰 점 두 개 (카메라 쪽 +z 얼굴 면)
    blob(upper, 0.014, 1, 1, 0.6, m.eye, -0.045, 1.275, 0.112);
    blob(upper, 0.014, 1, 1, 0.6, m.eye, 0.045, 1.275, 0.112);
    if (smile) {
      const mouth = add(upper, new THREE.TorusGeometry(0.04, 0.006, 8, 16, Math.PI), m.mouth, 0, 1.2, 0.108);
      mouth.rotation.z = Math.PI; // 아래로 굽은 호
    }

    // 반바지 (윗옷 없음: 맨몸 근육을 드러낸다)
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
