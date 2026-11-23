// Phase 0 데이터 검증
import { describe, expect, it } from 'vitest'
import rates from '../../src/data/rates.json' with { type: 'json' }
import returns from '../../src/data/returns.json' with { type: 'json' }

const ASOF_MONTH = /^\d{4}-(0[1-9]|1[0-2])$/
const ASOF_DATE = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/

type AssetType = {
  id: string
  label: string
  annualReturns: Record<string, number | null>
  isSample: boolean
  sampleYears: number[]
  source: string
}
const assetTypes = returns.assetTypes as AssetType[]

describe('rates.json', () => {
  for (const key of ['deposit', 'savings'] as const) {
    it(`${key}: min <= default <= max, 0~20% 범위`, () => {
      const r = rates[key]
      expect(r.min).toBeLessThanOrEqual(r.default)
      expect(r.default).toBeLessThanOrEqual(r.max)
      for (const v of [r.min, r.default, r.max]) {
        expect(v).toBeGreaterThan(0)
        expect(v).toBeLessThan(20)
      }
    })
  }

  it('asOf 형식 YYYY-MM', () => {
    expect(rates.asOf).toMatch(ASOF_MONTH)
  })

  it('isSample 불리언', () => {
    expect(typeof rates.isSample).toBe('boolean')
  })
})

describe('returns.json', () => {
  it('asOf 형식 YYYY-MM-DD', () => {
    expect(returns.asOf).toMatch(ASOF_DATE)
  })

  it('유형 2개 이상, id 중복 없음', () => {
    expect(assetTypes.length).toBeGreaterThanOrEqual(2)
    expect(new Set(assetTypes.map((a) => a.id)).size).toBe(assetTypes.length)
  })

  for (const a of assetTypes) {
    describe(a.id, () => {
      const years = Object.keys(a.annualReturns).map(Number).sort((x, y) => x - y)

      it('label은 ETF형 유형명', () => {
        expect(a.label).toMatch(/ETF형$/)
      })

      it('연도 누락 없음, asOf 연도까지 연속', () => {
        expect(years.length).toBeGreaterThan(0)
        years.forEach((y, i) => i > 0 && expect(y).toBe(years[i - 1] + 1))
        expect(years[years.length - 1]).toBe(Number(returns.asOf.slice(0, 4)))
      })

      it('상승률 하한 -100% 이상', () => {
        for (const v of Object.values(a.annualReturns)) {
          if (v != null) expect(v).toBeGreaterThanOrEqual(-1)
        }
      })

      it('null 값은 sampleYears에만 허용, isSample 일관성', () => {
        for (const [y, v] of Object.entries(a.annualReturns)) {
          if (v == null) expect(a.sampleYears).toContain(Number(y))
        }
        expect(a.isSample).toBe(a.sampleYears.length > 0)
      })

      it('source 필드 존재', () => {
        expect(a.source.length).toBeGreaterThan(0)
      })
    })
  }
})

describe('데이터 파일 금지 문자열', () => {
  const text = JSON.stringify([rates, returns])

  it('티커 의심 대문자 토큰 없음(ETF 제외)', () => {
    const tokens = (text.match(/(?<![A-Za-z0-9_])[A-Z]{2,5}(?![A-Za-z0-9_])/g) ?? []).filter((t) => t !== 'ETF')
    expect(tokens).toEqual([])
  })

  it('지수명과 기호 없음', () => {
    expect(text).not.toMatch(/nasdaq|s&p|dow|kospi|\^[A-Z]/i)
  })
})

describe('isSample 집계', () => {
  it('개수 출력', () => {
    const typeCount = assetTypes.filter((a) => a.isSample).length
    const yearCount = assetTypes.reduce((n, a) => n + a.sampleYears.length, 0)
    console.log(`isSample: 이율 ${rates.isSample ? 1 : 0}건, 수익률 유형 ${typeCount}건(연도 ${yearCount}건)`)
    expect(typeCount).toBeGreaterThanOrEqual(0)
  })
})
