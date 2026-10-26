# squat-shorts 설계: 피부 공급자 분리와 캐릭터 입히기 1차 (2단계)

작성일 2026-10-26. 코드는 쓰지 않았고 이 파일만 만들었다.
입력: `docs/tasks/2026-10-26-squat-shorts.md`(작업 지문), `docs/tasks/2026-10-26-squat-shorts-research.md`(1단계 조사), `shorts/squat-ep1/index.html`(현재 구현)
확정된 방향: 조사 문서의 A안. 지금 근육 모형을 유지하고 색, 질감, 얼굴, 옷으로 캐릭터를 입힌다. 외부 3D 모델 파일은 쓰지 않는다. 라이선스 확인은 필요 없다(연습 목적).

## 0. 확인한 사실 (설계 근거)

- `three.min.js`는 r160 UMD 빌드다. 1행이 `console.warn(...deprecated...)`이고 7행이 `"object"==typeof exports&&"undefined"!=typeof module?e(exports):...`다. 그래서 브라우저에서는 전역 `THREE`가 되고, Node에서는 `require()`로 불러올 수 있다(추측: Node에서 실제 로드는 아직 안 해 봤다. 테스트 T0에서 확인한다).
- 1행의 `console.warn`은 경고일 뿐 오류가 아니다. "콘솔 오류 없음" 검사에서 이 경고는 제외한다.
- 자세 함수 4개(`depthAt`, `poseAt`, `activationAt`, `cueAt`)는 이미 순수 함수다(index.html 56~98행). 다만 HTML 안에 있어서 Node에서 직접 테스트할 수 없다.
- 피부 메시는 지금 14개다. 몸통 4개(몸통, 어깨, 목, 머리), 팔 2×2, 다리 2×3(허벅지, 정강이, 발). 모두 재질 하나(`skinMat`)를 같이 쓴다.
- 근육 메시는 지금 11개다. 가슴 2, 복근 1, 다리마다 둔근, 대퇴사두, 햄스트링, 종아리가 하나씩 있어 4×2.
- 골반(`pelvis`)에는 피부가 없다. 그래서 지금은 X-ray를 꺼도 둔근이 보인다. 1차의 반바지가 이 부분을 덮으므로 X-ray를 끄면 둔근이 가려진다. 이 변화는 완료 기준 3("근육이 보이거나 가려진다")에 맞는 의도된 변경이다.
- 가슴 근육은 앞쪽이 z≈0.224까지 나와서 몸통 피부(반지름 0.2) 밖으로 튀어나온다. 근육 위치는 이번 범위 밖이라 그대로 둔다(기존과 같음).

## 1. 층 배치와 파일

```
shorts/squat-ep1/
  index.html                 [화면]  DOM, 렌더러, 카메라, 조명, 바닥, 버튼, 루프, 상태(elapsed, paused, xray)
  three.min.js               [외부]  변경 없음
  modules/
    motion.js                [순수]       시간 → 깊이, 자세, 활성도, 큐, 맥동
    character-style.js       [순수 데이터] 캐릭터 스타일 기본값 + 검증, 병합
    rig.js                   [장면 모듈]   뼈대(관절 그룹)와 근육 생성, 자세와 활성도 적용
    skin-primitive.js        [장면 모듈]   피부 공급자(기본): 피부, 머리카락, 얼굴, 옷
  tests/
    motion.test.js
    character-style.test.js
    rig.test.js
    skin-primitive.test.js
```

층 구분:
- 순수 모듈: 입력 값만 받아 새 값을 돌려준다. THREE, DOM, 전역을 쓰지 않는다.
- 장면 모듈: `THREE`를 인자로 받는다(전역 `THREE`를 읽지 않는다). 자기가 만든 객체와 인자로 받은 객체만 바꾼다. DOM, `window`, `document`, `performance`, `requestAnimationFrame`은 쓰지 않는다.
- 화면: 위 모듈을 부르는 유일한 곳이다. 시간(`elapsed`), 일시정지, X-ray 상태를 가진다.

## 2. 의존 방향

```
index.html (화면)
   ├─▶ modules/motion.js            (전역 SquatMotion)
   ├─▶ modules/character-style.js   (전역 CharacterStyle)
   ├─▶ modules/rig.js               (전역 SquatRig)       ◀─ THREE를 인자로 받음
   └─▶ modules/skin-primitive.js    (전역 PrimitiveSkin)  ◀─ THREE, joints, style을 인자로 받음
```

- 모듈끼리는 서로 부르지 않는다. 모듈 사이에서 오가는 값(joints, style, pose)은 화면이 넘겨준다.
- 모듈 파일 꼴: 클래식 스크립트로 쓰고, 공개 객체 하나만 내보낸다. Node(`module.exports`)와 브라우저 전역 등록을 둘 다 지원한다. 전역은 등록만 하고 읽지는 않는다.
  ```
  (function (root, factory) {
    const api = factory();
    if (typeof module === 'object' && module.exports) module.exports = api;
    else root.<이름> = api;
  })(this, function () { /* ... */ return Object.freeze({ ... }); });
  ```
- index.html의 로드 순서: `three.min.js` → `modules/motion.js` → `modules/character-style.js` → `modules/rig.js` → `modules/skin-primitive.js` → 화면 인라인 스크립트.
- 금지: 모듈 안에서 전역 `THREE` 참조(인자로 받은 THREE만 쓴다), `document`, `window`, `performance.now()`, `Math.random()`. 모양은 결정적이어야 한다.

## 3. 공개 인터페이스

### 3.1 `motion.js` → `SquatMotion` (순수)

| 이름 | 입력 | 출력 | 비고 |
|---|---|---|---|
| `CYCLE_MS` | - | `3200` | 상수 |
| `smooth(x)` | number | 0~1 | 입력을 [0,1]로 자른다 |
| `depthAt(ms)` | number(ms) | 0~1 | 기존 코드 그대로 옮긴다 |
| `poseAt(depth)` | 0~1 | `{ pelvisY, pelvisZ, lean, hip, knee, arm }` | 기존 그대로 |
| `activationAt(depth)` | 0~1 | `{ glute, quad, hams, calf }` | 기존 그대로 |
| `cueAt(ms)` | number(ms) | string | 기존 그대로 |
| `pulseAt(ms)` (새로 뺌) | number(ms) | `0.85 + 0.15*sin(ms/120)` | index.html 271행에서 옮긴다 |
| `muscleIntensity(level, pulse)` (새로 뺌) | number, number | `0.1 + level*1.4*pulse` | 287행에서 옮긴다 |

실패 시 동작: 기존 함수의 동작을 바꾸지 않는다. 입력 검증을 새로 넣지 않는다. 회귀 기준은 "지금과 같은 출력"이다. 지금 동작을 그대로 문서화하면 다음과 같다.
- 음수 ms: `depthAt(-100)`은 0이고, `cueAt(-100)`은 첫 번째 큐다. JS의 `%`가 음수를 돌려주기 때문이다.
- `NaN`: `depthAt(NaN)`은 `NaN`을 돌려준다. 화면은 `elapsed`를 0에서 시작해 더하기만 하므로 이 값이 들어올 일은 없다.

### 3.2 `character-style.js` → `CharacterStyle` (순수 데이터)

스타일 값은 데이터로 분리한다(결정 D3). 기본값은 다음과 같다(얼려 둔 객체).

```
DEFAULT_STYLE = {
  skin:   { color: 0xd9b28c, roughness: 0.6 },        // 기존 skinMat과 같다
  hair:   { color: 0x2a1d14, roughness: 0.9 },
  face:   { eyeColor: 0x111111, mouthColor: 0x7a3b2e, expression: 'smile' },
  top:    { color: 0xe5e7eb, roughness: 0.8 },        // 상의(민소매), 밝은 회색
  bottom: { color: 0x1e293b, roughness: 0.8 },        // 하의(반바지), 짙은 남색
  xray:   { baseOpacity: 0.35, overlayOpacity: 0.2 }, // baseOpacity는 기존 0.35와 같다
}
```
- 옷 색은 범례의 근육 색(파랑 #3b82f6, 빨강, 주황, 초록, 노랑, 장미색)과 겹치지 않게 무채색과 짙은 남색으로 골랐다. 정확한 색은 3단계에서 눈으로 보고 바꿔도 된다. 바꾸면 이 표와 테스트 기대값을 함께 고친다.

| 이름 | 입력 | 출력 | 실패 |
|---|---|---|---|
| `DEFAULT_STYLE` | - | 얼린 객체 | - |
| `EXPRESSIONS` | - | `['neutral', 'smile']` | - |
| `resolveStyle(overrides?)` | 부분 객체 또는 `undefined` | 기본값과 깊은 병합한 새 객체(깊게 얼림) | 잘못된 값이면 throw. 메시지에 경로를 넣는다(예: `"top.color"`) |

검증 규칙:
- 색: 정수이고 0 이상 0xffffff 이하. 아니면 `TypeError`.
- roughness와 opacity: 0 이상 1 이하의 유한수. 아니면 `RangeError`.
- `face.expression`: `EXPRESSIONS`에 있는 값. 아니면 `RangeError`.
- 모르는 키(예: `shoes`): `TypeError`. 오타를 조용히 넘기지 않기 위해서다.
- 입력 객체를 바꾸지 않는다. 같은 입력이면 같은 출력이다.

### 3.3 `rig.js` → `SquatRig` (장면 모듈)

index.html 136~227행(근육 재질, 뼈대, 근육)을 그대로 옮긴다. 피부 관련 줄(`addSkin` 호출, `skinMat`, `skinParts`)은 옮기지 않고 3.4로 보낸다.

| 이름 | 입력 | 출력 | 실패 |
|---|---|---|---|
| `MUSCLE_COLORS` | - | `{ glute, quad, hams, calf, core, chest }` (기존 COLORS) | - |
| `buildRig(THREE)` | THREE 네임스페이스 | `{ root, joints, muscles }` | `THREE`에 `Group`이나 `Mesh`가 없으면 `TypeError` |
| `applyPose(joints, pose)` | joints, `poseAt` 결과 | 없음. joints만 바꾼다 | 형식 검사는 하지 않는다(매 프레임 호출) |
| `applyActivation(muscles, act, pulse)` | muscles, `activationAt` 결과, `pulseAt` 결과 | 없음. 근육 재질 `emissiveIntensity`만 바꾼다 | 위와 같음. 키가 없으면 level 0.1(기존 `?? 0.1`) |

`joints` 계약은 피부 공급자가 의존하는 유일한 것이다.
```
joints = Object.freeze({
  pelvis: Group,                       // root의 자식, position.y 초기값 1.0
  upper:  Group,                       // pelvis의 자식
  arms:   [Group, Group],              // upper의 자식. [0]은 side -1(x=-0.3), [1]은 side +1
  legs:   [{ hip, thigh, knee }, {…}], // [0]은 side -1, [1]은 side +1
})
```
- 관절의 위치와 계층은 지금 값과 같다(hip (±0.13,-0.08,0), knee (0,-0.42,0), arm (±0.3,0.85,0)).
- `muscles`는 `[{ mesh, key }]`이고 11개다(0절). 테스트 기대값도 11이다.
- `applyPose`는 기존 `update()`의 273~283행과 같은 대입만 한다. `applyActivation`은 285~288행과 같다.

### 3.4 `skin-primitive.js` → `PrimitiveSkin` (피부 공급자, 핵심 이음매)

```
PrimitiveSkin.build(THREE, joints, style) -> SkinHandle

SkinHandle = Object.freeze({
  meshes:   ReadonlyArray<Mesh>,  // 이 공급자가 만든 모든 메시 (테스트와 점검용, 얼린 배열)
  setXray(on: boolean): void,
  dispose(): void,
})
```

입력:
- `THREE`: 네임스페이스. `Mesh`, `MeshStandardMaterial`, `SphereGeometry`, `CapsuleGeometry`, `TorusGeometry`를 쓴다.
- `joints`: 3.3의 계약.
- `style`: `resolveStyle()`의 결과. 공급자는 병합하지 않는다. 필요한 키가 없으면 실패한다.

만드는 것 (1차 범위):

| 층 | 메시 | 붙는 관절 | 재질 | 개수 |
|---|---|---|---|---|
| 기본(base) | 기존 피부 14개. 지오메트리, 위치, 스케일, 부모가 지금과 같다 | upper, arms, legs.thigh/knee | `skin` 하나를 공유 | 14 |
| 덧입힘(overlay) | 머리카락: 머리 위 반구 모양 덩어리(머리보다 조금 큼) | upper | `hair` | 1 |
| overlay | 눈: 작은 구 2개, +z 쪽(카메라 쪽) 얼굴 면 | upper | `eye` | 2 |
| overlay | 입: `smile`이면 Torus 호(아래로 굽음), `neutral`이면 납작한 구 | upper | `mouth` | 1 |
| overlay | 상의: 몸통 캡슐을 감싸는 캡슐(반지름 +0.008) | upper | `top` | 1 |
| overlay | 하의(골반): 둔근 2개를 감싸는 납작한 구 | pelvis | `bottom` | 1 |
| overlay | 하의(허벅지 위쪽): 허벅지 위 1/3을 감싸는 짧은 캡슐, 좌우 | legs[i].thigh | `bottom` 공유 | 2 |

합계는 메시 22개, 재질 6개(skin, hair, eye, mouth, top, bottom)다. 좌표 값은 3단계에서 눈으로 맞춘다. 다만 다음 두 조건은 테스트로 고정한다(5절).
- 하의(골반) 메시의 경계 상자가 둔근 메시 2개의 경계 상자를 포함한다.
- 눈과 입의 z 중심이 머리 중심(z=0.01)보다 크다. 즉 카메라 쪽 얼굴 면에 있다.

옷은 피부를 대체하지 않고 덧입힌다(결정 D4). 기본 피부 14개는 바꾸지 않으므로 회귀 비교가 쉽다.

`setXray(on)`:
- `on === true`: base 재질은 `opacity = style.xray.baseOpacity`(0.35), overlay 재질은 `opacity = style.xray.overlayOpacity`(0.2). 모두 `depthWrite = false`.
- `on === false`: 모든 재질이 `opacity = 1.0`, `depthWrite = true`.
- 모든 재질은 `transparent = true`를 유지한다(기존 skinMat과 같다). 바꿀 때마다 `needsUpdate = true`로 둔다.
- 같은 값으로 다시 불러도 결과가 같다(멱등).
- `on`이 boolean이 아니면 `TypeError`를 던지고 상태를 바꾸지 않는다.
- `dispose()` 뒤에 부르면 `Error('skin disposed')`를 던진다.

초기 상태: `build` 직후에는 X-ray 꺼짐이다(전부 불투명, depthWrite true). 화면은 `build` 바로 다음에 `setXray(xray)`를 부른다. 지금 `applyXray()`를 처음 부르는 자리(305행)와 같은 역할이다.

`dispose()`:
- 자기가 만든 메시를 부모에서 떼어 내고, 자기가 만든 지오메트리와 재질의 `dispose()`를 부른다.
- joints, 근육 메시, 근육 재질은 건드리지 않는다.
- 두 번 불러도 오류가 나지 않는다(두 번째는 아무것도 하지 않음).

실패 시 동작(build):
- `THREE`에 필요한 생성자가 없으면 `TypeError`.
- `joints`에 `pelvis`, `upper`, `arms[0..1]`, `legs[0..1].{hip,thigh,knee}` 중 빠진 것이 있으면 `TypeError`. 메시지에 빠진 경로를 넣는다(예: `"joints.legs[1].knee"`).
- `style`에 필요한 키가 없으면 `TypeError`.
- 원자성: 모든 검사를 메시를 붙이기 전에 끝낸다. 실패하면 joints에 아무것도 붙어 있지 않아야 한다.
- 화면은 build 실패를 잡지 않는다. 콘솔 오류로 드러나게 둔다. 프로그래밍 오류이므로 조용히 대체하지 않는다.

뒤에 다른 공급자를 붙일 자리(이번에는 만들지 않음): 나중에 glTF 공급자가 생기면 매 프레임 본을 맞추는 `sync(joints)`가 필요할 수 있다. 공급자가 하나뿐인 지금은 넣지 않는다. 두 번째 공급자가 생길 때 선택 메서드로 추가한다.

### 3.5 화면(index.html)에 남는 것

- DOM 요소, 렌더러, 장면, 카메라, 조명, 바닥, `resize`.
- 상태: `elapsed`, `paused`, `xray`(초기값 true), `lastCue`.
- 버튼 핸들러: X-ray 버튼은 `xray`를 뒤집고, aria와 글자를 바꾸고, `skin.setXray(xray)`를 부른다.
- 조립:
  ```
  style = CharacterStyle.resolveStyle()
  rig   = SquatRig.buildRig(THREE);  scene.add(rig.root)
  skin  = PrimitiveSkin.build(THREE, rig.joints, style);  skin.setXray(xray)
  ```
- `update(dt)`: 경과 시간을 더하고 `depth`, `pose`, `act`, `pulse`를 구한 뒤 `applyPose`, `applyActivation`을 부르고 큐 DOM을 갱신한다.
- `window.__squat`는 같은 키(`depthAt`, `activationAt`, `poseAt`, `cueAt`, `CYCLE_MS`)를 유지한다. 값은 `SquatMotion`에서 가져온다.
- 삭제할 것: `skinMat`, `skinParts`, `addSkin`, `applyXray`, `head` 변수(쓰는 곳 없음), 근육과 뼈대 생성 코드(rig.js로 옮김).

## 4. 입출력 예시 (회귀 기준값)

옮기기 전 코드로 계산한 값이다. 3단계 테스트의 기대값으로 쓴다. 비교는 허용 오차 `1e-9`로 한다(아래 주의 참고).

| ms | depthAt | cueAt |
|---|---|---|
| 0 | 0 | 엉덩이를 뒤로 빼고, 가슴은 위로 |
| 320 | 0.1464466094 (= 0.5 − 0.5·cos(π/4)) | 엉덩이를 뒤로 빼고, 가슴은 위로 |
| 640 | 0.5 | 엉덩이를 뒤로 빼고, 가슴은 위로 |
| 1279 | 1보다 작음 | 엉덩이를 뒤로 빼고, 가슴은 위로 |
| 1280 | 1 | 무릎은 발끝 방향, 허리는 곧게 |
| 1600 | 1 | 엉덩이로 밀어 올리기 |
| 2240 | 0.5 | 엉덩이로 밀어 올리기 |
| 2880 | 0 | 두 발은 어깨너비, 다시 시작 |
| 3199 | 0 | 두 발은 어깨너비, 다시 시작 |
| 3200 | 0 | 엉덩이를 뒤로 빼고, 가슴은 위로 |
| -100 | 0 | 엉덩이를 뒤로 빼고, 가슴은 위로 |

| depth | poseAt `{pelvisY, pelvisZ, lean, hip, knee, arm}` | activationAt `{glute, quad, hams, calf}` |
|---|---|---|
| 0 | 1, 0, 0, 0, 0, 0 | 0, 0, 0, 0 |
| 0.5 | 0.79, -0.125, 0.15, -0.6, 0.45, -0.7 | 0.5, 0.5, 0.35, 0.15 |
| 1 | 0.58, -0.25, 0.3, -1.2, 0.9, -1.4 | 1, 1, 0.7, 0.3 |

| 함수 | 입력 | 출력 |
|---|---|---|
| `pulseAt` | 0 | 0.85 |
| `muscleIntensity` | (0, 1) | 0.1 |
| `muscleIntensity` | (1, 1) | 1.5 |
| `muscleIntensity` | (0.5, 0.85) | 0.695 |

주의: `poseAt(0)`의 `pelvisZ`, `hip`, `arm`은 `-0`이다. `assert.deepStrictEqual`은 `-0`과 `0`을 다르게 보므로 쓰지 않는다. 필드마다 `Math.abs(a-b) < 1e-9`로 비교한다.

`resolveStyle` 예시:
- `resolveStyle()`은 `DEFAULT_STYLE`과 값이 같은 객체를 돌려준다(다른 참조).
- `resolveStyle({ top: { color: 0xff0000 } })`은 `top.color`만 0xff0000이 되고 `top.roughness`는 0.8로 남는다.
- `resolveStyle({ top: { color: -1 } })`은 `TypeError`를 던지고 메시지에 `top.color`가 들어간다.
- `resolveStyle({ face: { expression: 'angry' } })`는 `RangeError`를 던진다.
- `resolveStyle({ shoes: {} })`는 `TypeError`를 던진다.

## 5. 테스트할 항목 (3단계에서 먼저 쓸 것)

실행 명령: `node --test shorts/squat-ep1/tests/`. 의존 패키지는 없고 `node:test`와 `node:assert`만 쓴다. 장면 모듈 테스트는 `require('../three.min.js')`로 THREE를 받는다. WebGLRenderer는 만들지 않는다.

T0. 환경
- `require('../three.min.js')`가 성공하고 `THREE.REVISION === '160'`이다. 실패하면 장면 모듈 테스트는 막힌 상태로 보고한다. 순수 모듈 테스트는 그대로 진행한다.

T1. motion.js (회귀와 작업 md의 원래 검사 기준)
- 4절 표의 모든 값이 맞는다(오차 1e-9).
- 0에서 3200까지 10ms 간격으로 `depthAt`이 모두 [0,1] 안에 있다. `activationAt` 각 값도 [0,1] 안에 있다.
- 꼭대기(ms 0, 2880~3199)에서 `activationAt` 값이 모두 0이다.
- 바닥(1280~1599)에서 `depthAt`은 1이다.
- 주기성: 임의의 ms에서 `depthAt(ms) === depthAt(ms + CYCLE_MS)`이고, `cueAt`도 같다.
- 큐 경계: 1279/1280, 1599/1600, 2879/2880, 3199/3200에서 큐가 4절 표대로 바뀐다.
- 순수성: motion.js와 character-style.js 소스에 `document`, `window`, `THREE`, `performance`, `Math.random` 문자열이 없다(소스 텍스트 검사). rig.js와 skin-primitive.js는 `document`, `window`, `performance`, `Math.random`이 없는지만 본다(THREE는 인자 이름이라 허용).

T2. character-style.js
- 4절의 `resolveStyle` 예시 5개.
- `DEFAULT_STYLE`이 깊게 얼려져 있다(`Object.isFrozen(DEFAULT_STYLE.top)`).
- `resolveStyle`이 입력 객체를 바꾸지 않는다(호출 전후 JSON 비교).
- `DEFAULT_STYLE.skin.color === 0xd9b28c`, `roughness === 0.6`, `xray.baseOpacity === 0.35`. 기존 값과 같은지 회귀로 확인한다.

T3. rig.js
- `buildRig(THREE)` 결과에 `root`, `joints`, `muscles`가 있다. joints는 3.3의 계약 키를 모두 가진다.
- 계층: `joints.upper.parent === joints.pelvis`, `legs[i].thigh.parent === legs[i].hip`, `legs[i].knee.parent === legs[i].thigh`, `arms[i].parent === joints.upper`.
- 관절 초기 위치가 3.3의 값과 같다. `arms[0].position.x === -0.3`, `legs[0].hip.position.x === -0.13`이다.
- `muscles.length === 11`이고 키별 개수는 glute 2, quad 2, hams 2, calf 2, chest 2, core 1이다.
- `applyPose(joints, poseAt(1))` 뒤의 값: `pelvis.position.y ≈ 0.58`, `pelvis.position.z ≈ -0.25`, `upper.rotation.x ≈ 0.3`, 좌우 `hip.rotation.x ≈ -1.2`, `knee.rotation.x ≈ 0.9`, 좌우 `arm.rotation.x ≈ -1.4`.
- `applyActivation(muscles, activationAt(1), 1)` 뒤: glute 근육의 `emissiveIntensity ≈ 1.5`, chest와 core는 `≈ 0.1 + 0.1*1.4 = 0.24`(키가 없어 level 0.1).
- 모듈 안에 피부 메시가 없다. rig가 만든 메시는 모두 근육 재질을 쓴다.
- `buildRig({})`는 `TypeError`를 던진다.

T4. skin-primitive.js (공급자 결과 구조)
- `build(THREE, rig.joints, resolveStyle())`의 결과: `meshes.length === 22`, `Object.isFrozen(handle)`, `typeof setXray === 'function'`, `typeof dispose === 'function'`.
- 재질은 고유한 것이 6개다(`new Set(meshes.map(m => m.material)).size === 6`).
- 기본 피부 회귀: skin 재질을 쓰는 메시가 14개이고, 부모별 개수는 upper 4, arms 각 2, thigh 각 1, knee 각 2다. 머리 메시는 upper 아래 (0, 1.25, 0.01)에 있고 scale은 (1, 1.15, 1)이다.
- skin 재질의 `color.getHex() === 0xd9b28c`, `roughness === 0.6`.
- 옷 색 구분: top 재질 색 ≠ bottom 재질 색. 각각 style 값과 같다.
- 하의(골반) 메시가 `joints.pelvis`의 자식이다. `root.updateMatrixWorld(true)` 뒤 `Box3.setFromObject`로 잰 하의 상자가 둔근 2개의 상자를 포함한다.
- 얼굴: 눈 2개와 입 1개가 upper의 자식이고 z 중심이 0.01보다 크다. `expression: 'neutral'`과 `'smile'`에서 입 지오메트리 종류가 다르다.
- 붙는 위치: 이 공급자가 만든 메시의 부모는 모두 joints에 있는 그룹 중 하나다(root나 scene에 직접 붙지 않음).

T5. X-ray 토글 상태
- build 직후: 모든 재질이 `opacity === 1`, `depthWrite === true`, `transparent === true`.
- `setXray(true)` 뒤: skin 재질은 `opacity === 0.35`이고 `depthWrite === false`. 나머지 5개 재질은 `opacity === 0.2`이고 `depthWrite === false`.
- `setXray(false)` 뒤: 다시 모두 `opacity === 1`, `depthWrite === true`.
- 멱등: `setXray(true)`를 두 번 불러도 상태가 같다.
- `setXray('yes')`는 `TypeError`를 던지고 직전 상태를 유지한다.
- 근육 재질은 토글 전후에 바뀌지 않는다(opacity, depthWrite, emissiveIntensity를 스냅샷으로 비교).

T6. 실패와 정리
- `build(THREE, { ...joints, legs: [joints.legs[0]] }, style)`는 `TypeError`를 던지고 메시지에 `legs[1]`이 들어간다. 이때 모든 joints 그룹의 `children` 수가 호출 전과 같다(원자성).
- `build(THREE, joints, {})`는 `TypeError`를 던진다.
- `dispose()` 뒤: `meshes`의 모든 메시가 `parent === null`이고, joints 그룹의 children 수가 build 전과 같다. 근육 메시는 그대로 남아 있다.
- `dispose()`를 두 번 불러도 오류가 없다. dispose 뒤 `setXray(true)`는 `Error`를 던진다.
- 지오메트리와 재질의 `dispose`가 불렸는지는 `'dispose'` 이벤트 리스너로 센다(three의 EventDispatcher).

T7. 실행 확인 (수동, 3단계 끝)
- 브라우저로 index.html을 열었을 때 콘솔 오류가 0개다. three.min.js의 deprecated 경고 1개는 허용한다.
- X-ray 버튼으로 켜면 근육이 보인다. 끄면 몸통, 팔, 다리, 골반(둔근 포함)의 근육이 가려진다. 가슴 근육이 튀어나오는 것은 기존과 같으므로 허용한다.
- 9:16 프레임에서 얼굴(눈, 입), 머리카락, 상의와 하의 색 구분이 보인다. 스크린샷 1장을 남긴다.

## 6. 결정 기록

`docs/adr/` 폴더가 아직 없다. ADR 스킬은 폴더를 만들기 전에 사용자 확인을 받으라고 한다. 그래서 별도 파일을 만들지 않고 이 절에 ADR 형식으로 남긴다. 사용자가 원하면 3단계 이후 `docs/adr/0001-...`로 옮긴다.

### ADR-0001: 한 HTML 파일 대신 클래식 스크립트 모듈 여러 개로 나눈다

**Date**: 2026-10-26
**Status**: proposed
**Deciders**: 사용자(방향 3번 선택), 설계 담당

#### Context
자세 함수는 순수하지만 index.html 안에 있어 Node에서 테스트할 수 없다. 피부를 교체 가능한 공급자로 분리해야 한다. 프로토타입은 빌드 도구 없이 파일을 바로 열어(`file://`) 쓰고, three.min.js는 UMD 전역 스크립트다.

#### Decision
`shorts/squat-ep1/modules/` 아래에 클래식 스크립트 4개(motion, character-style, rig, skin-primitive)를 둔다. 각 파일은 UMD 꼴로 `module.exports`와 전역 등록을 둘 다 지원한다. THREE는 인자로 주입한다.

#### Alternatives Considered
- **한 파일 유지(섹션 구분)**: 변경이 가장 작다. 하지만 Node 테스트를 하려면 HTML에서 스크립트를 잘라 `eval`해야 해서 테스트가 깨지기 쉽다. 그래서 고르지 않았다.
- **ES 모듈(`type="module"`, import)**: 표준 방식이다. 하지만 Chrome은 `file://`에서 모듈 스크립트를 CORS로 막아 로컬 서버가 필요하고, three.min.js도 바꿔야 한다. 범위 대비 비용이 커서 고르지 않았다.
- **`src/modules/<이름>/index` 위치(WORKFLOW 기본)**: 이 저장소에는 아직 빌드와 src가 없고 쇼츠는 편마다 독립된 폴더다. 편 폴더 안 `modules/`에 둔다. 2편을 시작할 때 공통 모듈(character-style, rig, skin-primitive)을 `shorts/common/`으로 옮기고 그때 module-regression을 적용한다.

#### Consequences
- 좋은 점: `node --test`로 순수 모듈과 장면 모듈을 모두 테스트할 수 있다. 피부 공급자 교체가 파일 하나 교체로 끝난다. `file://`로 열기는 그대로 된다.
- 나쁜 점: 스크립트 태그 로드 순서에 의존한다. 전역 이름 4개가 생긴다.
- 위험: Node에서 three.min.js 로드가 실패할 수 있다. T0에서 먼저 확인하고, 실패하면 장면 모듈 테스트만 막힌 상태로 보고한다.

### 작은 결정 (ADR까지는 필요 없음)

- D2. rig(뼈대와 근육)도 화면에서 뺀다. 피부 공급자 테스트에 진짜 joints가 필요하고, `applyPose`/`applyActivation` 회귀를 Node에서 확인할 수 있어서다. 대안인 "화면에 두고 테스트에서는 가짜 Group으로 joints 만들기"는 실제 계층과 어긋날 위험이 있어 고르지 않았다.
- D3. 캐릭터 스타일 값을 데이터 모듈로 분리하고 `resolveStyle`로 검증한다. 2편 이후 옷이나 색 변형을 코드 변경 없이 하기 위해서다. 공급자 안에 상수로 박는 대안은 테스트 기대값이 공급자 내부에 묶여서 고르지 않았다.
- D4. 옷은 피부를 대체하지 않고 덧입힌다. 기본 피부 14개를 그대로 두어 회귀 비교가 단순해진다. 대신 X-ray에서 두 겹이 겹쳐 어두워지는 것을 막으려고 overlay 불투명도를 0.2로 낮춘다. 겹친 부분의 덮임 정도는 약 1−0.65×0.8 ≈ 0.48이다. 너무 어두우면 `xray.overlayOpacity`만 조정한다.
- D5. 질감 톤은 1차에서 `MeshStandardMaterial`의 color와 roughness로만 표현한다. 캔버스 텍스처는 DOM이 필요해 모듈 규칙에 어긋나므로 쓰지 않는다. 툰 셰이딩(`MeshToonMaterial` + DataTexture)과 외곽선은 2차 후보다.
- D6. 공급자 인터페이스에 `sync()` 같은 프레임 훅을 넣지 않는다. 공급자가 하나일 때의 이음매는 가상의 것이다. glTF 공급자가 실제로 생기면 그때 추가한다.

## 7. 3단계 진행 순서 (영향 범위 요약)

1. T0과 T1을 먼저 쓴다(실패 확인). `modules/motion.js`로 함수를 옮기고 통과시킨다. index.html은 `SquatMotion`을 쓰도록 바꾼다.
2. T2를 쓰고 `character-style.js`를 만든다.
3. T3을 쓰고 rig.js로 옮긴다. index.html의 136~227행과 273~288행이 바뀐다.
4. T4~T6을 쓰고 `skin-primitive.js`를 만든다. index.html의 130~134, 167~184, 197~198, 213, 220, 222, 229~235, 305행이 바뀐다.
5. T7 수동 확인, 스크린샷, 작업 md "세션 기록"과 "결과" 갱신.

바뀌지 않는 것: three.min.js, HUD와 범례 HTML, CSS, 카메라와 조명 값, 근육 위치와 색, X-ray 초기값(켜짐), 버튼 동작과 글자.

## 8. 3단계 전에 알아 둘 것

- 작업 md의 "범위 > 제외: 실제 근육 모델 에셋 교체"는 그대로 맞다. A안은 외부 에셋을 쓰지 않는다. 고칠 필요가 없다.
- 작업 md의 "인계 > 미결 질문"(직접 만들지, 외부 에셋을 쓸지)은 "직접(A안)"으로 답이 났다. 3단계 세션이 이 칸을 갱신한다.
