// amount.ts 단위 테스트. 금액 입력 경계값
import { describe, expect, it } from 'vitest'
import { parseAmountInput } from '../../src/core/amount.ts'
import { MAX_AMOUNT } from '../../src/core/calc.ts'

const v = (s: string) => parseAmountInput(s).value

describe('parseAmountInput', () => {
  it('빈 값과 0', () => {
    expect(parseAmountInput('')).toEqual({ value: 0, capped: false, negative: false })
    expect(v('0')).toBe(0)
    expect(v('000')).toBe(0)
    expect(v('   ')).toBe(0)
  })

  it('일반 숫자와 앞자리 0', () => {
    expect(v('18000')).toBe(18000)
    expect(v('007')).toBe(7)
  })

  it('붙여넣기 형식: 쉼표, 공백, 원', () => {
    expect(v('1,000원')).toBe(1000)
    expect(v(' 12 500 ')).toBe(12500)
    expect(v('₩4,500')).toBe(4500)
  })

  it('소수점 아래는 버린다', () => {
    expect(v('1234.56')).toBe(1234)
    expect(v('1,234.9원')).toBe(1234)
    expect(v('0.5')).toBe(0)
    expect(v('.5')).toBe(0)
  })

  it('음수는 0으로 보고 표시', () => {
    expect(parseAmountInput('-500')).toEqual({ value: 0, capped: false, negative: true })
    expect(parseAmountInput(' −500').negative).toBe(true)
    expect(parseAmountInput('－500').negative).toBe(true)
  })

  it('상한: 1억 이하 그대로, 초과는 상한과 표시', () => {
    expect(parseAmountInput(String(MAX_AMOUNT))).toEqual({ value: MAX_AMOUNT, capped: false, negative: false })
    expect(parseAmountInput(String(MAX_AMOUNT + 1))).toEqual({ value: MAX_AMOUNT, capped: true, negative: false })
    expect(parseAmountInput('9'.repeat(40))).toEqual({ value: MAX_AMOUNT, capped: true, negative: false })
  })

  it('전각 숫자', () => {
    expect(v('１２３４')).toBe(1234)
  })

  it('지수 표기는 숫자만 남긴다(1e5 → 15)', () => {
    expect(v('1e5')).toBe(15)
  })

  it('숫자가 없으면 0', () => {
    expect(v('만원')).toBe(0)
    expect(v('abc')).toBe(0)
  })

  it('결과는 항상 0 이상 상한 이하 정수', () => {
    for (const s of ['', '-1', '1.9', '１e９', '99999999999999999999', '12,34,5']) {
      const n = v(s)
      expect(Number.isInteger(n)).toBe(true)
      expect(n).toBeGreaterThanOrEqual(0)
      expect(n).toBeLessThanOrEqual(MAX_AMOUNT)
    }
  })
})
