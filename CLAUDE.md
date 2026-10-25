# 기본 개발 스킬

이 저장소에서 기능을 만들거나 구조를 바꿀 때는 아래 스킬을 기본으로 적용합니다. 요청에 스킬 이름이 없어도 해당 상황이면 먼저 호출합니다.

| 상황 | 스킬 | 호출 시점 |
|------|------|-----------|
| 설계 시작 | `codebase-design` | 모듈 경계, 의존 방향, 인터페이스를 정할 때 |
| 구조 확인 | `graphify` | 만든 뒤 관계도를 그려 설계와 대조할 때 |
| 고치기 전 | `change-impact` | 한 모듈을 바꾸기 전에 영향 범위를 볼 때 |
| 옮긴 뒤 검증 | `module-regression` | 옮기거나 바꾼 기능이 예전과 같은지 확인할 때 |
| 기능 만들기 | `test-driven-development` | 구현 코드를 쓰기 전에 테스트를 먼저 만들 때 |
| 결정 기록 | `architecture-decision-records` | 선택지 중 하나를 고르고 그 이유를 남길 때 |

## 순서

1. 기능을 만들 때: `codebase-design` → `change-impact` → `test-driven-development` → 구현
2. 구현 후: `module-regression` → `graphify`로 관계도 대조
3. 설계상 선택이 생기면 그때그때 `architecture-decision-records`

## 메모

- 모델 선택(`/model`)은 스킬이 아니므로 이 목록에 넣지 않습니다. 설계는 Opus, 반복 구현은 Sonnet, 검사·문서는 Haiku를 쓰는 식으로 상황에 맞게 고릅니다.
- `graphify`는 이 저장소가 아니라 사용자 환경(`~/.claude/skills/graphify`)에 설치돼 있습니다. 클라우드 세션에서는 `.claude/hooks/session-start.sh`가 설치합니다.
- 새 프로젝트에 이 세트를 옮길 때는 이 파일과 `.claude/skills/` 아래 해당 폴더 6개를 함께 복사합니다.
