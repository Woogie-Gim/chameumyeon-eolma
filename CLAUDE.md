# 참으면 얼마? (chameumyeon-eolma)

충동 소비 억제 웹앱. 사려는 금액을 입력하면 가정 이율과 과거 수익률로 환산해 3D 연출과 함께 보여 준다.
오케이금융그룹 AX 직군 지원용 포트폴리오 + 앱인토스 출시 목표. 지원 마감 12/6.

## 핵심 원칙 (항상 지킨다)

1. 서버 없음. 정적 JSON과 localStorage만 사용한다.
2. 런타임 LLM 및 외부 API 호출 금지. 문구는 `src/data/messages.json`에서 선택한다.
3. 상품명, 상호명, 브랜드명, 종목명, 티커, 금융기관명 금지. 사용자 입력과 화면과 데이터 모두 해당한다.
   - 예금과 적금은 이율만 보여 준다.
   - 주식은 ETF 유형의 상승률만 보여 준다. 개별 종목은 다루지 않는다.
   - 허용 예: 예금형, 적금형, 기술주 ETF형, 대형주 ETF형
4. 권유 표현 금지. 가정법과 관찰형만 쓴다.
   - 허용 예: 넣었다면 약 N원
   - 금지 예: 사세요, 넣으세요, 투자하세요
5. 게임 요소 금지. 레벨, 경험치, 캐릭터 육성, 확률형 뽑기, 현금성 보상을 만들지 않는다.
6. 모든 결과 화면에 고정 문구를 표시한다.
   - 가정 시뮬레이션이며 수익을 보장하지 않습니다. 과거 성과는 미래를 보장하지 않습니다.
7. 코드 주석은 간결체로 작성한다.
8. UI 문구는 한국어.
9. 데이터 값은 지어내지 않는다. 출처 없는 값은 `isSample: true`로 표시한다.
10. 사용자가 직접 입력한 원문은 화면에 표시하지 않고 저장하지 않고 전송하지 않는다.
    - 입력은 `src/core/inputFilter.ts`를 통과해야 한다.
    - 상호명이나 상품명으로 의심되면 입력을 거부하고 일반 명칭(치킨, 커피 등)으로 입력하라고 안내한다.
    - 일반 품목 사전(`src/data/items.json`)에 매칭된 일반 명칭만 사용한다. 매칭되지 않으면 기타 소비로 처리한다.

## 스택

Vite, React, TypeScript, three.js, @react-three/fiber, @react-three/drei, Vitest, Playwright, GitHub Actions

## 폴더 구조

```
src/core/      calc.ts, format.ts, bannedWords.ts, inputFilter.ts
src/data/      rates.json, returns.json, messages.json, tarot.json, items.json
src/scenes/    PiggyBank.tsx, Scale.tsx, TarotCard.tsx
src/screens/   Input, Result, Choice, Log, Settings, Tarot
src/store/     localStorage 래퍼
scripts/       fetch-data.ts, scan-banned.ts, banned-terms.txt
tests/         unit, e2e
docs/          PLAN, PROMPT_DEV, PROMPT_MESSAGES, SETUP, DATA_SOURCES
```

## 필수 npm 스크립트 (CI가 호출함)

| 스크립트 | 역할 |
| --- | --- |
| `npm run dev` | 개발 서버 |
| `npm run build` | 프로덕션 빌드 |
| `npm test` | Vitest 단위 테스트 |
| `npm run test:e2e` | Playwright E2E |
| `npm run scan:banned` | 금칙어 스캔 (`scripts/scan-banned.ts`) |
| `npm run fetch:data` | 데이터 수집 (`scripts/fetch-data.ts`) |

## 금칙어 스캔 규칙

- 대상: `src/` 전체와 `src/data/*.json`. `docs/DATA_SOURCES.md`는 제외한다.
- 한국어 권유 패턴: 사세요, 넣으세요, 투자하세요, 매수, 매도 등
- 영문 대문자 2~5자 토큰은 티커 의심으로 플래그한다. 허용 목록은 `scripts/allow-tokens.txt`.
- 상품명은 `scripts/banned-terms.txt`에 한 줄씩 적는다. 이 파일은 사용자가 채운다.
- 입력 필터 테스트도 포함한다. 상호명 입력 거부, 일반 명칭 허용, 입력 원문 미표시와 미저장을 확인한다.
- 위반이 하나라도 있으면 종료 코드 1로 실패한다.

## 작업 방식

- 단계는 `docs/PROMPT_DEV.md`의 Phase 순서를 따른다.
- 각 Phase가 끝나면 테스트를 실행하고 결과를 보고한 뒤 커밋한다.
- 모호한 부분은 질문하지 말고 합리적으로 가정해 진행한다. 가정은 `docs/ASSUMPTIONS.md`의 가정 목록에 기록한다.
- 커밋 메시지는 `feat:`, `fix:`, `test:`, `docs:`, `chore:` 접두어를 쓴다.
- 일정이 빠듯하면 3D 저울과 타로를 뒤로 미룬다. 환산, 기록, 3D 저금통, 테스트, CI가 우선이다.
