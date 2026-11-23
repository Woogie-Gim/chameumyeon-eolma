# 데이터 출처

Phase 0 스크립트(`npm run fetch:data`)가 수집한 값의 출처를 기록한다. 이 파일은 앱 번들에 포함하지 않고 금칙어 스캔에서 제외한다.
수집일: 2026-11-23

## 이율

| 유형 | 출처 URL | 수집일 | 이용 조건 | 비고 |
| --- | --- | --- | --- | --- |
| 예금형 | 한국은행 ECOS 오픈API, 통계 121Y002 예금은행 수신금리(신규취급액 기준) 정기예금 `BEABAA211`, 만기 구간 `BEABAA2111~2117` <https://ecos.bok.or.kr/api/> | 2026-11-23 | 한국은행 경제통계시스템 이용 조건, 출처 표시. 공개 샘플 키(`sample`, 요청당 10행) 사용 | 2025-10~2026-09 월별 12개 값의 중앙값을 default로 사용. min, max는 12개월 값과 2026-09 만기 구간 값을 합친 범위 |
| 적금형 | 같은 통계의 정기적금 `BEABAA212`, 만기 구간 `BEABAA2121~2122` | 2026-11-23 | 위와 같음 | 위와 같음 |

교차 검증: 같은 통계의 분기(Q) 값과 해당 분기 월평균을 비교했다(같은 기관의 데이터라 독립 출처는 아니다).

| 유형 | 분기 | 분기값 | 월평균 | 차이(%p) |
| --- | --- | --- | --- | --- |
| 예금형 | 2026Q3 | 3.23 | 3.227 | 0.003 |
| 적금형 | 2026Q3 | 3.62 | 3.62 | 0 |

## 수익률

| 유형 | 출처 URL | 수집일 | 이용 조건 | 교차검증 출처 |
| --- | --- | --- | --- | --- |
| 기술주 ETF형 | Nasdaq-100 지수(`^NDX`) 월봉, Yahoo Finance chart API <https://query1.finance.yahoo.com/v8/finance/chart/%5ENDX> | 2026-11-23 | 비공식 엔드포인트. Yahoo 이용약관상 재배포 제한 가능성 있음. 앱에는 가공된 연간 상승률만 포함 | Wikipedia "Nasdaq-100" Annual returns 표(CC BY-SA 4.0) <https://en.wikipedia.org/wiki/Nasdaq-100> |
| 대형주 ETF형 | S&P 500 지수(`^GSPC`) 월봉, Yahoo Finance chart API <https://query1.finance.yahoo.com/v8/finance/chart/%5EGSPC> | 2026-11-23 | 위와 같음 | Wikipedia "S&P 500" Performance 표의 Price return 열(CC BY-SA 4.0) <https://en.wikipedia.org/wiki/S%26P_500> |

- 계산 방식: 연도별 12월 월봉 종가 / 전년 12월 월봉 종가 - 1. USD 기준 가격 수익률(배당 제외, 환율 미반영).
- 기간: 2000~2025년(26개 연도). 진행 중인 2026년은 제외.
- 교차 검증 결과: 두 유형 52개 연도 모두 차이 0%p(소수 둘째 자리 기준).
- 주의: Wikipedia Nasdaq-100 표는 Yahoo Finance를 인용하므로 기술주 ETF형은 완전한 독립 검증이 아니다. 지수 공식 산출기관 자료와 몇 개 연도를 직접 대조할 것을 권장한다.

## 메모

- 두 출처의 값이 1%p 이상 다르면 isSample로 남기고 `docs/DATA_TODO.md`에 적는다.
- 지수명과 기호는 이 파일과 `scripts/fetch-data.ts`에만 둔다. `src/data/*.json`에는 id와 유형 label만 저장한다.
