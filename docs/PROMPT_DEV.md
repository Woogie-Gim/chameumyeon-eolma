# 개발 프롬프트 (Claude Code용)

## 시작 방법

프로젝트 폴더에서 Claude Code를 실행한 뒤 아래 한 줄을 붙여넣는다.

```text
CLAUDE.md와 docs/PLAN.md, docs/PROMPT_DEV.md를 읽어 줘. package.json이 없으면 이 폴더에 Vite react-ts 템플릿으로 먼저 초기화하고 CLAUDE.md의 필수 npm 스크립트를 만들어 줘. 기존 문서와 설정 파일은 덮어쓰지 마. 그다음 Phase 0부터 순서대로 진행하고 각 Phase가 끝나면 테스트 결과를 보고한 뒤 커밋해 줘.
```

아래는 Claude Code가 읽는 상세 지시다.

---

역할: 시니어 프론트엔드 개발자 겸 QA 엔지니어.
목표: 충동 소비 억제 웹앱 "참으면 얼마?" MVP를 구현한다. 앱인토스 웹뷰 등록을 염두에 둔다.

## 데이터 스키마

- `items.json`: 일반 품목 사전. 각 항목은 id, label(치킨, 커피 같은 일반 명칭), category(hunger, stress, reward, impulse), aliases(일반 명칭 동의어). 상호명과 브랜드명은 넣지 않는다.
- `rates.json`: deposit, savings 각각 min, default, max 연 이율과 asOf 날짜. Phase 0 스크립트가 생성하며 직접 작성하지 않는다.
- `returns.json`: assetTypes 배열. 각 항목은 id, label(기술주 ETF형, 대형주 ETF형 등), annualReturns(연도별 상승률), isSample 플래그.
  - 수익률 값을 지어내지 않는다. 샘플 값에는 isSample true를 달고 화면에 샘플 데이터 배지를 표시한다.
  - source와 asOf 필드를 둔다.
- `messages.json`: id, category(hunger, stress, reward, impulse), amountBand(low, mid, high), tone(funny, calm, stern), template.
  - template의 숫자는 {amount}, {years}, {future}, {item} 자리표시자만 허용한다.
- `tarot.json`: 22개 항목. id, name, keyword, adviceTemplate.

## 구현 단계

### Phase 0. 데이터 수집

스크립트로 자동화하고 값은 반드시 출처에서 가져온다.

- `scripts/fetch-data.ts`를 만들어 공개 통계에서 이율 구간과 유형별 연도 수익률을 수집하고 `src/data/*.json`을 생성한다.
- 이율: 공개 금융 통계 또는 공공 오픈API에서 예금형과 적금형의 최근 금리 분포를 구해 min, default(중앙값), max로 저장한다. API 키가 필요하면 `.env.example`에 항목만 만들고 나에게 알려 준다.
- 수익률: 공개 지수 통계에서 ETF 유형별 연도별 연간 상승률을 구한다. 지수명과 티커는 JSON에 저장하지 않고 id와 유형 label만 저장한다.
- 출처 URL, 수집일, 이용 조건은 `docs/DATA_SOURCES.md`에만 기록한다. 앱 번들에는 포함하지 않고 금칙어 스캔에서 이 파일은 제외한다.
- 앱 설정 화면에는 공개 통계 기반이라는 문구와 기준일만 표시한다.
- 값을 찾지 못하거나 서로 다른 두 출처가 1%p 이상 차이 나면 임의로 채우지 말고 isSample true로 남기고 목록을 `docs/DATA_TODO.md`에 적는다.
- 데이터 검증 테스트: 연도 누락, 수익률 하한(-100% 미만 불가), 이율 min <= default <= max, asOf 형식, isSample 항목 개수 출력.
- 웹 접근이 안 되면 수집을 시도하지 말고 `data-input/*.csv` 템플릿과 변환 스크립트만 완성해 내가 값을 붙여넣을 수 있게 한다.

### Phase 1. 코어

`calc.ts` 순수 함수를 테스트 먼저 작성한다.

- `futureValueCompound(principal, annualRate, years)`
- `timeMachine(principal, assetTypeId, startYear)` (ETF 유형 상승률로 환산)
- 원 단위 반올림, 천 단위 콤마 포맷.
- 경계값 테스트: 0원, 최대 금액, 소수점 반올림, 연도 범위 밖.

### Phase 2. 화면 (2D 먼저 완성)

- Input: 카테고리 칩과 직접 입력 칸을 모두 지원한다.
  - 직접 입력은 `src/core/inputFilter.ts`를 통과해야 한다.
  - 상호명, 브랜드명, 상품명으로 의심되면 입력을 거부하고 일반 명칭(치킨, 커피 등)으로 입력하라고 안내한다.
  - 입력 원문은 화면에 표시하지 않고 저장하지 않고 전송하지 않는다. `items.json`에 매칭된 일반 명칭만 사용하고 매칭되지 않으면 기타 소비로 처리한다.
- Result: 환산 결과, 시간 슬라이더(1~10년), 한마디, 고정 문구.
  - 예금과 적금은 적용 이율만 표시한다.
  - 주식은 ETF 유형의 상승률만 표시한다. 개별 종목과 상품 설명은 표시하지 않는다.
- Choice: 참았어요 / 먹었어요.
- Log: 누적 아낀 금액, 연속 일수, 주간 막대 그래프.
- Settings: 기본 가정 이율 변경, 저사양 3D 끄기, 데이터 초기화, 데이터 기준일 표시.

### Phase 3. 3D

- PiggyBank: 시간 슬라이더에 따라 코인 탑이 늘어난다. InstancedMesh 사용, 코인 수 상한 설정.
- Scale: 음식 더미와 코인 더미가 올라가며 저울이 기운다.
- 외부 모델 파일 없이 프로시저럴 지오메트리만 쓴다.
- WebGL 미지원, 저사양, prefers-reduced-motion이면 2D 폴백.
- 조작 요소, 점수, 승패 없음.

### Phase 4. 재물운 타로

- 날짜 기반 시드로 하루 한 장.
- 카드 3D 플립.
- 소비 조언 한 줄. 환산 판정에 영향을 주지 않는다.
- 포인트와 보상 연결 없음.
- 화면에 재미로만 보는 오락 콘텐츠라는 문구를 고정한다.

### Phase 5. QA

- 금칙어 스캔: 소스와 JSON 전체에서 상품명, 상호명, 티커, 명령형 권유 표현 탐지.
- 입력 필터 테스트: 상호명과 브랜드명 입력 거부, 일반 명칭 허용, 사전에 없는 단어는 기타 소비 처리, 입력 원문이 화면과 localStorage에 남지 않는지 확인.
- `messages.json` 스키마 검증과 자리표시자 누락 검사.
- Playwright E2E: 입력, 결과, 선택, 기록 한 시나리오.
- WebGL 비활성 환경 폴백 테스트.
- GitHub Actions에서 위 항목을 푸시마다 실행.

## 작업 방식

- 각 Phase가 끝나면 테스트를 실행하고 결과를 보고한 뒤 커밋한다.
- 모호한 부분은 질문하지 말고 합리적으로 가정해 진행하고 가정 목록을 README에 기록한다.
- README에 설계 근거를 쓴다: 왜 런타임 LLM을 쓰지 않았는지, 문구를 사전 생성한 이유, 계산과 문구를 분리한 이유.

## 일정 우선순위 (12/6 마감 기준)

1. Phase 0~2 (환산, 화면, 기록)
2. Phase 5의 단위 테스트, 금칙어 스캔, CI
3. Phase 3의 PiggyBank
4. 앱인토스 심사 제출 (12/1 목표)
5. Phase 3의 Scale, Phase 4 (출시 후 업데이트로 가능)
