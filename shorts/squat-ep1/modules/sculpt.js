// 순수 모듈: 구(SphereGeometry)의 정점을 가우시안 봉우리로 밀어 근육 덩어리를 만든다.
// THREE는 인자로 받고, DOM과 전역은 읽지 않는다. 결과는 항상 결정적이다.
// 각 부위 함수는 { geometry, scale }을 돌려준다. 메시는 mesh.scale.set(...scale)로 쓴다.
// 봉우리는 바깥쪽으로만 민다(높이 >= 0). 그래서 피부 면은 언제나 기본 타원체 바깥에 있다.
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.Sculpt = api;
})(this, function () {
  // 봉우리 { c: [x,y,z], r, h }. c는 메시 중심 기준 위치(미터). 가장 가까운 표면 점으로 투영한다.
  // r: 영향 반경, h: 가장 높은 곳의 솟음. 값은 exp(-2 (d/r)^2)로 줄어든다.
  const mirror = (bumps) => bumps.flatMap((b) =>
    (b.c[0] === 0 ? [b] : [b, { ...b, c: [-b.c[0], b.c[1], b.c[2]] }]));

  function need(THREE) {
    if (!THREE || typeof THREE.SphereGeometry !== 'function') throw new TypeError('THREE.SphereGeometry is required');
  }

  function mergeSeamNormals(geometry) {
    const pos = geometry.attributes.position;
    const nor = geometry.attributes.normal;
    const groups = new Map();
    for (let i = 0; i < pos.count; i++) {
      const k = `${Math.round(pos.getX(i) * 1e5)},${Math.round(pos.getY(i) * 1e5)},${Math.round(pos.getZ(i) * 1e5)}`;
      if (!groups.has(k)) groups.set(k, []);
      groups.get(k).push(i);
    }
    for (const ids of groups.values()) {
      if (ids.length < 2) continue;
      let x = 0, y = 0, z = 0;
      for (const i of ids) { x += nor.getX(i); y += nor.getY(i); z += nor.getZ(i); }
      const l = Math.hypot(x, y, z) || 1;
      for (const i of ids) nor.setXYZ(i, x / l, y / l, z / l);
    }
    nor.needsUpdate = true;
  }

  // radius: 기본 반지름, scale: 메시 배율, bumps: 봉우리 목록. 타원체 반축은 radius * scale.
  function ellipsoid(THREE, radius, scale, bumps, seg) {
    need(THREE);
    const [wSeg, hSeg] = seg || [40, 28];
    const geometry = new THREE.SphereGeometry(radius, wSeg, hSeg);
    const a = scale.map((s) => radius * s);
    const centers = bumps.map((b) => {
      const k = Math.sqrt((b.c[0] / a[0]) ** 2 + (b.c[1] / a[1]) ** 2 + (b.c[2] / a[2]) ** 2) || 1;
      if (!(b.h >= 0)) throw new RangeError('bump height must be >= 0');
      return { x: b.c[0] / k, y: b.c[1] / k, z: b.c[2] / k, inv: 2 / (b.r * b.r), h: b.h };
    });
    const pos = geometry.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      // 반지름이 radius인 구 위의 점을 타원체 위로 옮긴다
      const px = pos.getX(i) / radius * a[0];
      const py = pos.getY(i) / radius * a[1];
      const pz = pos.getZ(i) / radius * a[2];
      let d = 0;
      for (const c of centers) {
        const dx = px - c.x, dy = py - c.y, dz = pz - c.z;
        d += c.h * Math.exp(-(dx * dx + dy * dy + dz * dz) * c.inv);
      }
      // 타원체 법선 방향으로 민다
      let nx = px / (a[0] * a[0]), ny = py / (a[1] * a[1]), nz = pz / (a[2] * a[2]);
      const nl = Math.hypot(nx, ny, nz) || 1;
      nx /= nl; ny /= nl; nz /= nl;
      // 법선으로 민 점을 메시 로컬로 돌린다 (scale은 메시가 적용한다)
      pos.setXYZ(i, (px + nx * d) / scale[0], (py + ny * d) / scale[1], (pz + nz * d) / scale[2]);
    }
    geometry.computeVertexNormals();
    mergeSeamNormals(geometry);
    return { geometry, scale: scale.slice() };
  }

  // 몸통: 중심 = 가슴 높이. 반축 (0.22, 0.42, 0.25)
  function torso(THREE) {
    const bumps = [
      ...mirror([
        { c: [0.105, 0.15, 0.25], r: 0.15, h: 0.065 }, // 대흉근 위
        { c: [0.11, 0.07, 0.25], r: 0.11, h: 0.045 }, // 대흉근 아래
        { c: [0.17, 0.24, 0.2], r: 0.09, h: 0.02 }, // 쇄골 아래
        { c: [0.18, 0.13, 0.16], r: 0.09, h: 0.05 }, // 대흉근 바깥 모서리(겨드랑이 앞)
        { c: [0.04, 0.03, 0.25], r: 0.045, h: 0.04 }, // 복근 1단
        { c: [0.04, -0.07, 0.25], r: 0.045, h: 0.04 }, // 복근 2단
        { c: [0.04, -0.17, 0.25], r: 0.045, h: 0.04 }, // 복근 3단
        { c: [0.04, -0.27, 0.25], r: 0.045, h: 0.035 }, // 복근 4단
        { c: [0.16, -0.1, 0.1], r: 0.09, h: 0.025 }, // 복사근
        { c: [0.2, 0.12, -0.08], r: 0.14, h: 0.055 }, // 광배근 옆
        { c: [0.14, 0.12, -0.25], r: 0.14, h: 0.045 }, // 광배근 뒤
        { c: [0.08, 0.28, -0.22], r: 0.10, h: 0.035 }, // 승모근 아래
      ]),
      { c: [0, 0.05, -0.25], r: 0.10, h: 0.015 }, // 척추기립근 사이
    ];
    return ellipsoid(THREE, 0.1, [2.2, 4.2, 2.5], bumps, [64, 48]);
  }

  // 어깨 윗선(승모근). 중심 y = 0.9
  function shoulders(THREE) {
    const bumps = mirror([{ c: [0.12, 0.07, -0.04], r: 0.09, h: 0.03 }, { c: [0.24, 0.05, 0], r: 0.08, h: 0.02 }]);
    return ellipsoid(THREE, 0.1, [3.1, 0.85, 1.4], bumps, [48, 24]);
  }

  function neck(THREE) {
    const bumps = mirror([{ c: [0.05, -0.08, -0.03], r: 0.07, h: 0.03 }]);
    return ellipsoid(THREE, 0.06, [1, 1.5, 1], bumps, [24, 16]);
  }

  // 머리는 작게. 배율 (1, 1.15, 1)은 기존과 같다.
  function head(THREE) {
    const bumps = [
      { c: [0, -0.08, 0.07], r: 0.06, h: 0.008 }, // 턱
      ...mirror([{ c: [0.03, 0.045, 0.1], r: 0.045, h: 0.006 }]), // 눈썹뼈
    ];
    return ellipsoid(THREE, 0.115, [1, 1.15, 1], bumps, [32, 24]);
  }

  // side: -1 왼쪽(x 음수), 1 오른쪽. 바깥쪽 = side 방향
  function upperArm(THREE, side) {
    const bumps = [
      { c: [side * 0.07, 0.15, 0.03], r: 0.10, h: 0.045 }, // 삼각근 전, 측면
      { c: [side * 0.06, 0.13, -0.06], r: 0.09, h: 0.035 }, // 삼각근 후
      { c: [0, -0.03, 0.08], r: 0.09, h: 0.04 }, // 이두근
      { c: [0, 0.0, -0.08], r: 0.085, h: 0.035 }, // 삼두근
      { c: [side * 0.07, -0.02, -0.03], r: 0.08, h: 0.015 }, // 삼두 바깥 갈래
    ];
    return ellipsoid(THREE, 0.08, [1.05, 3.0, 1.05], bumps, [32, 28]);
  }

  function foreArm(THREE, side) {
    const bumps = [
      { c: [side * 0.04, 0.1, 0.03], r: 0.08, h: 0.025 }, // 완요골근
      { c: [-side * 0.03, 0.08, -0.04], r: 0.08, h: 0.02 }, // 굴곡근
      { c: [0, -0.02, 0.05], r: 0.06, h: 0.012 },
    ];
    return ellipsoid(THREE, 0.06, [1, 3.3, 1], bumps, [28, 24]);
  }

  function thigh(THREE, side) {
    const bumps = [
      { c: [0, -0.03, 0.1], r: 0.1, h: 0.03 }, // 대퇴직근
      { c: [side * 0.08, -0.04, 0.05], r: 0.1, h: 0.04 }, // 외측광근
      { c: [-side * 0.06, -0.11, 0.07], r: 0.07, h: 0.03 }, // 내측광근(물방울)
      { c: [side * 0.05, -0.02, -0.09], r: 0.1, h: 0.03 }, // 대퇴이두근
      { c: [-side * 0.03, -0.02, -0.09], r: 0.09, h: 0.025 }, // 반건양근
      { c: [0, -0.2, 0.08], r: 0.05, h: 0.015 }, // 슬개골 쪽
    ];
    return ellipsoid(THREE, 0.1, [1.0, 2.4, 1.0], bumps, [32, 32]);
  }

  function calf(THREE, side) {
    const bumps = [
      { c: [side * 0.035, 0.07, -0.07], r: 0.06, h: 0.035 }, // 비복근 바깥 갈래
      { c: [-side * 0.035, 0.08, -0.07], r: 0.06, h: 0.04 }, // 비복근 안쪽 갈래
      { c: [side * 0.02, 0.06, 0.05], r: 0.05, h: 0.015 }, // 전경골근
      { c: [0, 0.18, 0.04], r: 0.05, h: 0.01 }, // 무릎 아래
    ];
    return ellipsoid(THREE, 0.08, [0.95, 2.6, 0.95], bumps, [28, 28]);
  }

  function foot(THREE) {
    return ellipsoid(THREE, 0.05, [1.4, 0.6, 2.0], [], [20, 14]);
  }

  return Object.freeze({ ellipsoid, torso, shoulders, neck, head, upperArm, foreArm, thigh, calf, foot });
});
