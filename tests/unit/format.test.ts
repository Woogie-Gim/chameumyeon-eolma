// format.ts 단위 테스트
import { describe, expect, it } from 'vitest'
import { formatNumber, formatPercent, formatWon, roundWon } from '../../src/core/format.ts'

describe('roundWon', () => {
  it('원 단위 반올림', () => {
    expect(roundWon(1029.5)).toBe(1030)
    expect(roundWon(1029.49)).toBe(1029)
    expect(roundWon(0)).toBe(0)
  })
})

describe('formatNumber', () => {
  it('천 단위 콤마', () => {
    expect(formatNumber(0)).toBe('0')
    expect(formatNumber(999)).toBe('999')
    expect(formatNumber(1000)).toBe('1,000')
    expect(formatNumber(1234567)).toBe('1,234,567')
    expect(formatNumber(100000000)).toBe('100,000,000')
  })

  it('음수와 소수 반올림', () => {
    expect(formatNumber(-1234567)).toBe('-1,234,567')
    expect(formatNumber(1234.6)).toBe('1,235')
  })
})

describe('formatWon', () => {
  it('원 표기', () => {
    expect(formatWon(1234)).toBe('1,234원')
    expect(formatWon(0)).toBe('0원')
  })
})

describe('formatPercent', () => {
  it('부호와 소수 첫째 자리', () => {
    expect(formatPercent(0.2017)).toBe('+20.2%')
    expect(formatPercent(-0.3297)).toBe('-33.0%')
    expect(formatPercent(0)).toBe('0.0%')
  })

  it('자릿수 지정', () => {
    expect(formatPercent(0.0288, 2)).toBe('+2.88%')
  })
})
