// 금액 입력 해석. 입력 칸 값(타이핑, 붙여넣기)을 원 단위 정수로 바꾼다
import { MAX_AMOUNT } from './calc.ts'

export type AmountParse = { value: number; capped: boolean; negative: boolean }

// 앞 공백 뒤의 마이너스(하이픈, 수학 기호, 전각)는 음수로 본다
const NEGATIVE = /^\s*[-−－]/

export function parseAmountInput(raw: string): AmountParse {
  const s = raw.normalize('NFKC')
  if (NEGATIVE.test(s)) return { value: 0, capped: false, negative: true }
  // 소수점 아래는 버린다. 쉼표, 공백, 원 같은 나머지 문자는 무시
  const digits = s.split('.')[0].replace(/[^0-9]/g, '').replace(/^0+/, '')
  if (digits === '') return { value: 0, capped: false, negative: false }
  // 매우 긴 숫자는 Number 정밀도와 무관하게 상한 처리
  if (digits.length > String(MAX_AMOUNT).length) return { value: MAX_AMOUNT, capped: true, negative: false }
  const n = Number(digits)
  return n > MAX_AMOUNT ? { value: MAX_AMOUNT, capped: true, negative: false } : { value: n, capped: false, negative: false }
}
