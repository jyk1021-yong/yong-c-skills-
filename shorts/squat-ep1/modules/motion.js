// 순수 모듈: 시간 -> 깊이, 자세, 활성도, 큐, 맥동. 외부 의존 없음.
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.SquatMotion = api;
})(this, function () {
  const CYCLE_MS = 3200;

  function smooth(x) {
    return 0.5 - 0.5 * Math.cos(Math.PI * Math.min(Math.max(x, 0), 1));
  }

  // 0 = 선 자세, 1 = 바닥 자세. 내려가기 40%, 바닥 유지 10%, 올라오기 40%, 위 유지 10%
  function depthAt(ms) {
    const t = (ms % CYCLE_MS) / CYCLE_MS;
    if (t < 0.4) return smooth(t / 0.4);
    if (t < 0.5) return 1;
    if (t < 0.9) return 1 - smooth((t - 0.5) / 0.4);
    return 0;
  }

  // 자세 값 (골반 높이, 골반 뒤로 이동, 상체 기울기, 엉덩이·무릎 각도, 팔 각도)
  function poseAt(depth) {
    return {
      pelvisY: 1.0 - depth * 0.42,
      pelvisZ: -depth * 0.25,
      lean: depth * 0.3,
      hip: -depth * 1.2,
      knee: depth * 0.9,
      arm: -depth * 1.4,
    };
  }

  // 근육별 활성도 (0~1)
  function activationAt(depth) {
    return {
      glute: depth,
      quad: depth,
      hams: depth * 0.7,
      calf: depth * 0.3,
    };
  }

  // 단계별 큐 자막
  function cueAt(ms) {
    const t = (ms % CYCLE_MS) / CYCLE_MS;
    if (t < 0.4) return '엉덩이를 뒤로 빼고, 가슴은 위로';
    if (t < 0.5) return '무릎은 발끝 방향, 허리는 곧게';
    if (t < 0.9) return '엉덩이로 밀어 올리기';
    return '두 발은 어깨너비, 다시 시작';
  }

  function pulseAt(ms) {
    return 0.85 + 0.15 * Math.sin(ms / 120);
  }

  function muscleIntensity(level, pulse) {
    return 0.1 + level * 1.4 * pulse;
  }

  return Object.freeze({ CYCLE_MS, smooth, depthAt, poseAt, activationAt, cueAt, pulseAt, muscleIntensity });
});
