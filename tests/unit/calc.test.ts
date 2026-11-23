// calc.ts 단위 테스트
import { describe, expect, it } from 'vitest'
import {
  MAX_AMOUNT,
  amountBand,
  futureValueCompound,
  installmentFutureValue,
  timeMachine,
  type ReturnsData,
} from '../../src/core/calc.ts'
import returns from '../../src/data/returns.json' with { type: 'json' }

// 테스트용 주입 데이터
const fixture: ReturnsData = {
  asOf: '2025-12-31',
  assetTypes: [
    {
      id: 'up',
      label: '테스트 상승형',
      annualReturns: { '2022': 0.1, '2023': 0.2, '2024': -0.5, '2025': 0.1 },
      isSample: false,
      sampleYears: [],
      source: '테스트',
    },
    {
      id: 'gap',
      label: '테스트 누락형',
      annualReturns: { '2023': 0.1, '2024': null, '2025': 0.1 },
      isSample: true,
      sampleYears: [2024],
      source: '테스트',
    },
  ],
}

describe('futureValueCompound', () => {
  it('연 복리 계산', () => {
    expect(futureValueCompound(10000, 0.05, 2)).toBe(11025)
  })

  it('0원은 0원', () => {
    expect(futureValueCompound(0, 0.03, 10)).toBe(0)
  })

  it('이율 0%와 0년은 원금 그대로', () => {
    expect(futureValueCompound(12345, 0, 10)).toBe(12345)
    expect(futureValueCompound(12345, 0.05, 0)).toBe(12345)
  })

  it('원 단위 반올림', () => {
    // 1001 * 1.0288 = 1029.8288
    expect(futureValueCompound(1001, 0.0288, 1)).toBe(1030)
    // 1000 * 1.0005 = 1000.5 → 1001
    expect(futureValueCompound(1000, 0.0005, 1)).toBe(1001)
  })

  it('최대 금액 허용, 초과는 거부', () => {
    expect(futureValueCompound(MAX_AMOUNT, 0.03, 1)).toBe(103_000_000)
    expect(() => futureValueCompound(MAX_AMOUNT + 1, 0.03, 1)).toThrow(RangeError)
  })

  it('음수, 소수, 비숫자 금액 거부', () => {
    expect(() => futureValueCompound(-1, 0.03, 1)).toThrow(RangeError)
    expect(() => futureValueCompound(100.5, 0.03, 1)).toThrow(RangeError)
    expect(() => futureValueCompound(Number.NaN, 0.03, 1)).toThrow(RangeError)
  })

  it('기간과 이율 범위 검사', () => {
    expect(() => futureValueCompound(1000, 0.03, -1)).toThrow(RangeError)
    expect(() => futureValueCompound(1000, 0.03, 1.5)).toThrow(RangeError)
    expect(() => futureValueCompound(1000, 0.03, 51)).toThrow(RangeError)
    expect(() => futureValueCompound(1000, -0.01, 1)).toThrow(RangeError)
    expect(() => futureValueCompound(1000, 1.5, 1)).toThrow(RangeError)
  })
})

describe('timeMachine', () => {
  it('시작 연도 초부터 마지막 연도 말까지 누적', () => {
    const r = timeMachine(10000, 'up', 2022, fixture)
    // 1.1 * 1.2 * 0.5 * 1.1 = 0.726
    expect(r.value).toBe(7260)
    expect(r.multiplier).toBeCloseTo(0.726, 10)
    expect(r.cumulativeReturn).toBeCloseTo(-0.274, 10)
    expect(r.startYear).toBe(2022)
    expect(r.endYear).toBe(2025)
    expect(r.years).toBe(4)
    expect(r.isSample).toBe(false)
  })

  it('마지막 연도 시작은 한 해 상승률만 반영', () => {
    expect(timeMachine(10000, 'up', 2025, fixture).value).toBe(11000)
  })

  it('음수 상승률 구간은 원금 미만', () => {
    const r = timeMachine(10000, 'up', 2024, fixture)
    expect(r.value).toBe(5500)
    expect(r.value).toBeLessThan(10000)
  })

  it('0원은 0원', () => {
    expect(timeMachine(0, 'up', 2022, fixture).value).toBe(0)
  })

  it('최대 금액 처리, 초과 거부', () => {
    expect(timeMachine(MAX_AMOUNT, 'up', 2025, fixture).value).toBe(110_000_000)
    expect(() => timeMachine(MAX_AMOUNT + 1, 'up', 2025, fixture)).toThrow(RangeError)
  })

  it('소수점 반올림', () => {
    // 333 * 1.1 = 366.3 → 366
    expect(timeMachine(333, 'up', 2025, fixture).value).toBe(366)
  })

  it('연도 범위 밖 거부', () => {
    expect(() => timeMachine(10000, 'up', 2021, fixture)).toThrow(RangeError)
    expect(() => timeMachine(10000, 'up', 2026, fixture)).toThrow(RangeError)
    expect(() => timeMachine(10000, 'up', 2023.5, fixture)).toThrow(RangeError)
  })

  it('알 수 없는 유형 거부', () => {
    expect(() => timeMachine(10000, 'none', 2023, fixture)).toThrow(RangeError)
  })

  it('값이 없는 연도가 포함되면 거부', () => {
    expect(() => timeMachine(10000, 'gap', 2023, fixture)).toThrow(RangeError)
    expect(timeMachine(10000, 'gap', 2025, fixture).value).toBe(11000)
  })

  it('isSample 전달', () => {
    expect(timeMachine(10000, 'gap', 2025, fixture).isSample).toBe(true)
  })

  it('실제 데이터로 계산하고 기준 연도 포함', () => {
    const data = returns as ReturnsData
    const endYear = Number(data.asOf.slice(0, 4))
    for (const a of data.assetTypes) {
      const r = timeMachine(10000, a.id, endYear)
      const expected = Math.round(10000 * (1 + (a.annualReturns[String(endYear)] as number)))
      expect(r.value).toBe(expected)
      expect(r.endYear).toBe(endYear)
    }
  })
})

describe('amountBand', () => {
  it('구간 경계', () => {
    expect(amountBand(0)).toBe('low')
    expect(amountBand(9999)).toBe('low')
    expect(amountBand(10000)).toBe('mid')
    expect(amountBand(49999)).toBe('mid')
    expect(amountBand(50000)).toBe('high')
    expect(amountBand(MAX_AMOUNT)).toBe('high')
  })
})

describe('installmentFutureValue', () => {
  it('매월 초 납입, 월 복리(연 이율/12)', () => {
    // 10000 × Σ(1.01^k, k=1..12) = 128,093.28
    expect(installmentFutureValue(10000, 0.12, 1)).toEqual({ totalPaid: 120000, value: 128093 })
  })

  it('0원과 0년은 0', () => {
    expect(installmentFutureValue(0, 0.03, 5)).toEqual({ totalPaid: 0, value: 0 })
    expect(installmentFutureValue(10000, 0.03, 0)).toEqual({ totalPaid: 0, value: 0 })
  })

  it('이율 0%는 납입액 그대로', () => {
    expect(installmentFutureValue(15000, 0, 3)).toEqual({ totalPaid: 540000, value: 540000 })
  })

  it('예상 금액은 총 납입액 이상', () => {
    const r = installmentFutureValue(18000, 0.0292, 10)
    expect(r.totalPaid).toBe(18000 * 120)
    expect(r.value).toBeGreaterThan(r.totalPaid)
  })

  it('원 단위 반올림', () => {
    // 1 × Σ(1.001^k, k=1..12) = 12.078... → 12
    expect(installmentFutureValue(1, 0.012, 1).value).toBe(12)
    expect(Number.isInteger(installmentFutureValue(333, 0.0288, 7).value)).toBe(true)
  })

  it('최대 금액 허용, 범위 밖 거부', () => {
    expect(installmentFutureValue(MAX_AMOUNT, 0, 1).totalPaid).toBe(MAX_AMOUNT * 12)
    expect(() => installmentFutureValue(MAX_AMOUNT + 1, 0.03, 1)).toThrow(RangeError)
    expect(() => installmentFutureValue(-1, 0.03, 1)).toThrow(RangeError)
    expect(() => installmentFutureValue(100.5, 0.03, 1)).toThrow(RangeError)
    expect(() => installmentFutureValue(1000, -0.01, 1)).toThrow(RangeError)
    expect(() => installmentFutureValue(1000, 0.03, 51)).toThrow(RangeError)
    expect(() => installmentFutureValue(1000, 0.03, 1.5)).toThrow(RangeError)
  })
})
