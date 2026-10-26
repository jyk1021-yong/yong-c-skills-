# squat-shorts 조사: 캐릭터를 씌우는 방법 (1단계)

작성일 2026-10-26. 코드는 쓰지 않았고, 이 파일만 만들었다.

## 1. 요구 정리

- 목표(작업 md): 3D 근육 캐릭터가 스쿼트를 하고, 활성 근육을 투시해 보여 주는 9:16 쇼츠. (`docs/tasks/2026-10-26-squat-shorts.md`)
- 새 요구: 지금의 절차적 모형 위에 사람형, 근육질 "캐릭터"를 씌운다. 2D와 3D 중 무엇인지는 미정이다.
- 제약: 외부 CDN이 막혀 있어 three.js는 로컬 파일로 쓴다. 외부 모델은 라이선스를 확인하고 받는다.
- 범위 충돌: 작업 md의 "제외"에 "실제 근육 모델 에셋 교체"가 있다. 이번 작업은 이 항목을 바꾸는 일이므로 범위 수정 여부를 사용자가 정해야 한다. 같은 md의 목표는 "3D 근육 캐릭터"라고 적혀 있어 2D는 콘셉트와도 어긋난다.

## 2. 관련 기존 코드 (확인한 것)

파일은 `shorts/squat-ep1/index.html`과 `shorts/squat-ep1/three.min.js`뿐이다.

- 순수 함수: `depthAt`, `activationAt`, `poseAt`, `cueAt` (56~98행). 화면과 분리돼 있어 어떤 방향을 골라도 그대로 쓴다.
- 뼈대는 `THREE.Group` 계층이다. `root > pelvis > upper > arm` 과 `pelvis > hip > thigh > knee` (157~225행).
- 자세 적용은 `update()` 한 곳이다 (266~295행). 골반 위치, `upper.rotation.x`, 좌우 `hip.rotation.x`, `knee.rotation.x`, `arm.rotation.x`만 만진다. 즉 관절은 X축 회전만 쓰는 2D 측면 동작이다.
- 피부는 `skinMat` 한 재질이다. `addSkin()`이 만든 `skinParts` 배열에 메시가 모인다 (130~134, 174~177행). 그런데 `skinParts`는 어디서도 읽지 않는다. 근육은 `addMuscle()`이 `activeMuscles`에 모으고 emissive 값만 바꾼다.
- X-ray는 `applyXray()`가 `skinMat.opacity`(0.35 또는 1.0)와 `depthWrite`만 바꾼다 (231~235행).
- 근육 메시는 뼈대 그룹의 자식이라, 피부를 바꿔도 근육은 같은 관절에 붙어 움직인다.
- three.min.js는 r160이다 (7행에 `const e="160"`). GLTFLoader는 들어 있지 않다 (검색 결과 없음). 추측: 이 파일이 일반 스크립트인지 모듈인지는 열어 보지 않아 모른다. 3D 방향에서는 이것이 첫 확인 항목이다.

## 3. 방향 후보

| 항목 | A. 현재 모형 유지 + 색, 윤곽 입히기 | B. 2D 일러스트 파츠 (SVG/캔버스) | C. 3D 외부 모델(glTF) |
|---|---|---|---|
| 방식 | 같은 프리미티브에 만화풍 셰이딩, 외곽선, 얼굴, 머리, 옷을 추가 | 일러스트를 파츠로 쪼개 관절 피벗에 붙임. `poseAt` 값으로 회전 | glTF 캐릭터를 로드해 본(bone)을 `poseAt`에 맞춰 돌림. 피부 층을 이 모델로 교체 |
| 근육 X-ray | 현재 그대로 됨 | 근육 층 그림을 따로 그려 겹치고 알파 조절. 가능하지만 근육 파츠도 직접 그려야 함 | 가능하나 어려움. 모델 근육 메시를 활성 표시용으로 쓰거나, 현재 근육 덩어리를 새 피부 안에 계속 둠 |
| 필요 준비물 | 없음 (저장소 안에서 끝남) | 파츠 일러스트 약 15~20장 (머리, 몸통, 골반, 상박, 하박, 손, 허벅지, 종아리, 발, 근육 층) | glTF/GLB 1개, GLTFLoader 로컬 파일, 라이선스 확인 |
| 라이선스 위험 | 없음 | 일러스트를 직접 만들거나 생성하면 낮음 | 모델 출처에 따라 다름 (아래 4절) |
| 장점 | 가장 빠름. 위험 없음. 완료 기준을 그대로 유지 | 쇼츠에 맞는 만화풍 만들기 쉬움. 렌더 가볍다 | 콘셉트("3D 근육 캐릭터")와 일치. 카메라 회전, 좌우 분할 비교(스토리보드 15~22초)에 유리 |
| 단점 | "캐릭터"라는 느낌이 약함 (캡슐과 구) | 측면 한 각도에 묶임. 3D 콘셉트와 불일치. 파츠를 사람이 그려야 함. 관절 이음새 처리가 번거로움 | 일반 모델은 근육 단위로 나뉘어 있지 않아 근육 켜기는 별도 작업. 본 이름과 비율을 우리 뼈대에 맞춰야 함. 파일 크기와 로더 준비 |
| 위험 | 낮음 | 중간 (그림 품질에 좌우, 스택 병행) | 높음 (라이선스, 리깅, X-ray 정합) |

## 4. 후보별 근거

### 2D 방식 (B)
- 구현: SVG는 각 파츠를 `<g>`로 묶고 `transform-origin`을 관절 위치에 두고 회전한다. 캔버스는 `ctx.translate/rotate`를 계층으로 쓴다. 우리 `update()`가 회전만 쓰므로 `poseAt` 값을 라디안으로 그대로 옮길 수 있다 (추측: 직접 이식해 본 적은 없음).
- X-ray: 피부 파츠 그룹의 `opacity`를 0.35와 1.0으로 바꾸면 현재 토글과 같은 동작이다. 근육은 별도 파츠 그림 필요.
- 이 방식은 코드 기준으로 완전히 새 렌더러다. 기존 three.js 장면(조명, 카메라, 근육 메시)을 버린다. 이 점이 가장 큰 비용이다.
- 근거 파일: `shorts/squat-ep1/index.html` 266~295행(관절 값 적용부).

### 3D 방식 (C)
- 맞추는 방법 두 가지 (일반 지식, 추측 포함):
  1. 본 매핑: 모델의 SkinnedMesh 본(예: 엉덩이, 허벅지, 정강이, 어깨)을 찾아 `hip.rotation.x` 등 값을 본에 복사한다. 본 이름이 모델마다 달라 매핑표가 필요하다.
  2. 계층 부착: 본 대신 우리 `thigh`, `knee` 그룹에 모델 파츠를 자식으로 붙인다. 모델이 분리 메시일 때만 쉽다.
- 로더: 현재 `three.min.js`에는 GLTFLoader가 없다. r160용 `examples/jsm/loaders/GLTFLoader.js`와 `BufferGeometryUtils` 등 의존 파일을 로컬로 받아야 한다. 일반 스크립트 방식이면 모듈 import로 바꾸는 큰 변경이 필요할 수 있다. 샌드박스에서 CDN이 막혀 있으니 npm 등으로 받거나 사용자가 파일을 넣어야 한다.
- 모델 후보와 라이선스 (이번 조사에서 직접 파일을 내려받지는 않았다):
  - Quaternius Universal Base Characters: 남녀 6종, 휴머노이드 리그, Superhero 체형 포함. 페이지 표기는 CC0 1.0이고 상업 이용 가능. 다만 제3자 글은 Quaternius가 새 에셋에 별도 "Quaternius Asset Licence"를 쓴다고 하므로, 받을 때 페이지와 zip 안의 라이선스 파일을 직접 확인해야 한다. 근육 정도는 "Superhero" 체형이 가깝다는 추정이며 확인하지 않았다. https://quaternius.itch.io/universal-base-characters
  - Mixamo: Adobe 도움말은 개인, 상업, 비영리 프로젝트에 로열티 없이 쓸 수 있다고 안내한다. 원본 캐릭터/애니메이션 파일을 재배포하는 것은 안 된다는 것이 포럼 인용이다 (공식 문구 확인 필요). Adobe ID 필요. 즉 사용자가 직접 받아 저장소에 넣을지(재배포 문제) 정해야 한다. https://helpx.adobe.com/creative-cloud/faq/mixamo-faq.html , https://community.adobe.com/t5/mixamo-discussions/mixamo-faq-licensing-royalties-ownership-eula-and-tos/m-p/13234775
  - 유료/불명확: CGTrader, TurboSquid의 근육 모델은 대부분 유료이고 "Royalty Free"는 CC0와 다르다. Sketchfab "Highly Detailed Human Muscles"는 페이지에서 권리 표기가 불명확했다. 쓰려면 개별 약관 확인이 필요하다. 예: https://www.cgtrader.com/3d-models/character/man/mr-muscles-realistic-muscular-male-game-ready-character-rigged , https://sketchfab.com/3d-models/highly-detailed-human-muscles-male-a45f140fc8d241e89e613a7ad742f919
  - 무료 근육질 + glTF + CC0를 모두 만족하는 모델은 일반 검색에서 찾지 못했다.
- 라이선스 확인 절차(받을 때): 1) 배포 페이지에서 라이선스 이름과 URL 기록 2) zip 안의 LICENSE 또는 readme 확인 3) CC-BY류면 저작자 표기 문구를 영상 설명과 저장소 `LICENSES` 메모에 남김 4) 재배포 금지류이면 저장소에 커밋하지 않음 5) 받은 날짜와 주소를 작업 md에 기록.

### 현재 모형 유지 (A)
- 바꿀 곳은 `skinMat` 재질 하나와 머리, 얼굴 정도다. 근거: 130~134, 180~184행. 윤곽선은 `three.min.js`에 포함된 기본 클래스만으로 가능한 방법(뒷면 확대 메시)이 있다 (추측).

## 5. 피부 층을 교체 가능하게 만드는 최소 구조 (3절 C와 A 공통)

코드 변경 없이 설계만 적는다.

- 지금 피부가 코드에 흩어진 이유: `addSkin()`이 메시를 `parent`에 직접 붙이고, `skinParts`는 모아 두기만 한다.
- 제안: 피부를 "관절 부착점"에만 의존하게 한다.
  1. 각 관절 그룹(`upper`, `thigh`, `knee`, `arm`)을 이미 있는 이름으로 `joints` 객체 하나로 모은다. 피부 공급자는 이 객체만 받는다.
  2. 피부 공급자 인터페이스: `build(joints) -> { setXray(on), dispose() }`. 지금의 프리미티브 피부를 `buildPrimitiveSkin`으로 옮기면 기본 공급자가 된다. 새 캐릭터는 `buildGltfSkin`으로 같은 형태를 구현한다.
  3. `update()`는 그대로 둔다. 관절 그룹만 돌리고, 본 매핑은 공급자 쪽 책임이다 (C라면 매 프레임 `joints`의 회전을 본에 복사하는 훅을 공급자가 가진다).
  4. `applyXray()`는 `skin.setXray()` 호출로 바꾼다. 재질이 여럿이어도 공급자 안에서 처리한다.
- 이득: 근육, 자세, 자막 코드는 건드리지 않고 피부만 갈아끼운다. 작업 md의 "순수 함수 분리" 원칙과 같은 방향이다.
- 3D 모델을 쓸 때의 구조적 쟁점: 근육 덩어리(`activeMuscles`)는 피부 안쪽 프리미티브라, 새 모델의 몸 부피와 맞지 않으면 근육이 삐져나오거나 가려진다. 근육을 모델 크기에 맞춰 다시 배치해야 한다.

## 6. 이 저장소 안에서 가능한 것과 외부 준비물

저장소 안에서 가능:
- A 전부 (색, 윤곽, 머리/얼굴, 의상 프리미티브).
- 5절의 피부 공급자 분리 설계와 구현.
- B의 코드 틀(파츠 계층, 회전 적용), 단 그림은 별도.

외부 준비물:
- B: 파츠 일러스트 (SVG 또는 투명 PNG), 직접 제작이든 생성이든 사용자 소유 확인.
- C: glTF/GLB 파일 1개, GLTFLoader 로컬 사본(r160용, 의존 파일 포함), 모델의 라이선스 증빙, 필요하면 저작자 표기.
- 공통: 쇼츠에 쓸 때 사용 가능한 라이선스인지(상업 수익 포함) 사용자 확인.

## 7. 추천: A를 먼저, 그다음 5절 구조를 넣어 C로 이어간다

추천은 하나다. **A(현재 모형 유지 + 색, 윤곽, 머리, 옷)를 하되, 피부를 공급자로 분리해 둔다.**

이유:
- 완료 기준 5개가 지금 모형으로 모두 충족 가능하고, 외부 파일과 라이선스 위험이 0이다.
- 5절의 분리는 작아서(피부 생성과 X-ray 호출만 이동) 나중에 C로 가기 쉽게 만든다. 반대로 지금 C로 곧장 가면 GLTFLoader 확보, 본 매핑, 근육 재배치, 라이선스 확인이 한꺼번에 걸린다.
- B는 3D 콘셉트와 어긋나고, 지금 three.js 장면을 버리게 된다. 근육 투시도 직접 그려야 해서 비용 대비 이득이 작다.
- 단, 사용자가 "진짜 사람 같은 근육 캐릭터"를 원하면 최종적으로는 C가 필요하다. 그때를 위한 준비가 위 구조다.

## 8. 사용자가 결정할 질문

1. 작업 md의 "제외: 실제 근육 모델 에셋 교체"를 풀 것인가? (A만 하면 유지, C를 하면 변경해야 함)
2. 원하는 완성도: 만화풍 캐릭터(A로 충분)인가, 사실적인 근육질 모델(C)인가?
3. C로 가면 외부 모델 파일을 누가 가져오는가? (사용자가 Mixamo/Quaternius에서 받아 넣기, 또는 이 세션에서 받기)
4. 쇼츠를 수익 채널에 올릴 것인가? (상업 이용 가능 라이선스만 허용할지 결정)
5. 현재 `three.min.js`가 일반 스크립트인지 모듈인지 확인 후, GLTFLoader용으로 모듈 방식 전환을 허용할 것인가? (C 선택 시)
6. 2D(B)는 정말 후보로 남길 것인가? 콘셉트가 "3D 근육 캐릭터"로 확정돼 있어 제외를 제안한다.

## 9. 열린 항목 (확인 못한 것)

- Quaternius Universal Base Characters의 현재 정확한 라이선스 (CC0 표기 vs Quaternius Asset Licence). 직접 받아서 확인 필요.
- Mixamo의 현재 공식 재배포 조건 (포럼 인용만 확인).
- "Superhero" 체형이 근육질로 보이는 정도 (미리보기 미확인).
- `three.min.js` r160의 모듈/스크립트 형태.
- 이번에 외부 모델 파일은 내려받지 않았다.

## 출처

- https://quaternius.itch.io/universal-base-characters
- https://helpx.adobe.com/creative-cloud/faq/mixamo-faq.html
- https://community.adobe.com/t5/mixamo-discussions/mixamo-faq-licensing-royalties-ownership-eula-and-tos/m-p/13234775
- https://www.cgtrader.com/3d-models/character/man/mr-muscles-realistic-muscular-male-game-ready-character-rigged
- https://www.turbosquid.com/3d-models/muscular-man-in-suit-rigged-and-game-ready-2350110
- https://sketchfab.com/3d-models/highly-detailed-human-muscles-male-a45f140fc8d241e89e613a7ad742f919
