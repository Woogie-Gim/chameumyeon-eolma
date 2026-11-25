// 화면 고정 문구와 안내 문구

// 모든 결과 화면 고정 문구
export const DISCLAIMER = '가정 시뮬레이션이며 수익을 보장하지 않습니다. 과거 성과는 미래를 보장하지 않습니다.'

// ETF 유형 환산 결과 전용 문구
export const ETF_DISCLAIMER = '지수 가격 기준이며 배당, 보수, 환율은 반영하지 않았습니다.'

// 타로 화면 고정 문구
export const TAROT_NOTICE = '재미로만 보는 오락 콘텐츠입니다. 카드 결과는 환산 결과나 소비 기록과 관계없습니다.'

// 개인정보 안내. 안내 화면 상단과 입력 화면에 표시
export const PRIVACY_NOTE = '입력 내용은 서버로 전송되거나 저장되지 않아요.'
// 기록은 기기 저장소에 남으므로 함께 표시
export const PRIVACY_DETAIL = '참은 기록(품목, 금액, 날짜)은 이 기기에만 남아요.'

// 저장소를 쓸 수 없을 때 설정 화면 안내
export const STORAGE_MEMORY_NOTICE = '이 브라우저에서는 기록을 저장할 수 없어 앱을 닫으면 사라져요.'

// 렌더 오류 안내 화면
export const ERROR_COPY = {
  title: '화면을 표시하는 중 문제가 생겼어요',
  body: '저장된 기록은 그대로 있어요. 다시 시도하면 처음 화면부터 다시 열어요.',
  retry: '다시 시도',
} as const

// 금액 입력 안내
export const AMOUNT_MESSAGES = {
  capped: '최대 1억 원까지 계산해요.',
  negative: '금액은 1원 이상으로 입력해 주세요.',
} as const

// 사전에 없는 품목 표시명
export const OTHER_LABEL = '기타 소비'

// 입력 필터 안내 문구
export const FILTER_MESSAGES = {
  brand: '상호명이나 상품명은 받지 않아요. 치킨, 커피 같은 일반 명칭으로 입력해 주세요.',
  latin: '영문은 상호명일 수 있어 받지 않아요. 치킨, 커피 같은 일반 명칭을 한글로 입력해 주세요.',
  empty: '품목을 치킨, 커피 같은 일반 명칭으로 입력해 주세요.',
  tooLong: '품목명은 짧게, 치킨이나 커피 같은 일반 명칭으로 입력해 주세요.',
} as const

// 이용 안내 화면 문구. 기준일은 화면에서 데이터 파일 값으로 채운다
export type GuideSection = { id: string; title: string; paragraphs: string[] }

export function guideSections(asOf: { rates: string; returns: string }): GuideSection[] {
  return [
    {
      id: 'about',
      title: '서비스 소개',
      paragraphs: [
        '참으면 얼마?는 사려던 금액을 가정 이율과 과거 상승률로 환산해 보여 주는 재미 목적의 가정 시뮬레이션입니다.',
        '금융 상품을 소개하거나 연결하지 않으며, 계산 결과는 참고용 숫자입니다.',
      ],
    },
    {
      id: 'data',
      title: '데이터 출처',
      paragraphs: [
        '이율과 상승률은 공개 통계를 바탕으로 정리한 값입니다.',
        `이율 기준일은 ${asOf.rates}, 상승률 기준일은 ${asOf.returns}입니다.`,
        'ETF형 상승률은 유형별 대표 지수의 가격 기준이며 배당, 보수, 환율은 반영하지 않았습니다.',
        '예금형과 적금형은 이율만, ETF형은 유형별 상승률만 보여 주며 개별 상품이나 종목은 다루지 않습니다.',
      ],
    },
    {
      id: 'disclaimer',
      title: '면책',
      paragraphs: [
        DISCLAIMER,
        '화면의 숫자는 세금, 수수료, 물가 변동을 반영하지 않은 단순 계산입니다. 실제 결과와 다를 수 있습니다.',
      ],
    },
    {
      id: 'privacy',
      title: '개인정보',
      paragraphs: [
        '이 서비스는 서버로 아무것도 전송하지 않습니다. 기록과 설정은 이 기기의 브라우저 저장소에만 저장됩니다.',
        '직접 입력한 문장은 저장하지 않으며, 일반 품목명과 금액, 날짜, 선택만 기록합니다.',
        '설정의 데이터 초기화로 저장된 기록과 설정을 모두 지울 수 있습니다.',
      ],
    },
    {
      id: 'tarot',
      title: '타로',
      paragraphs: ['타로는 재미로만 보는 오락 콘텐츠입니다. 카드 결과는 판단의 근거가 아닙니다.'],
    },
  ]
}
