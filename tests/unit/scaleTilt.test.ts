// scaleTilt.ts 단위 테스트. 양수면 환산 코인 쪽이 내려간다
import { describe, expect, it } from 'vitest'
import { MAX_TILT, RATIO_CAP, scaleSide, scaleTilt } from '../../src/core/scaleTilt.ts'

describe('scaleTilt', () => {
  it('같은 금액이면 수평', () => {
    expect(scaleTilt(10000, 10000)).toBe(0)
    expect(scaleTilt(1, 1)).toBe(0)
  })

  it('환산 금액이 크면 양수, 작으면 음수(ETF 하락 구간)', () => {
    expect(scaleTilt(10000, 12000)).toBeGreaterThan(0)
    expect(scaleTilt(10000, 8000)).toBeLessThan(0)
  })

  it('비율이 같으면 금액 크기와 무관', () => {
    expect(scaleTilt(1000, 1500)).toBeCloseTo(scaleTilt(1_000_000, 1_500_000), 12)
  })

  it('배율과 역배율은 크기가 같고 방향이 반대', () => {
    expect(scaleTilt(10000, 20000)).toBeCloseTo(-scaleTilt(20000, 10000), 12)
  })

  it('비율이 커질수록 단조 증가', () => {
    const ratios = [0.2, 0.4, 0.6, 0.8, 1, 1.2, 1.6, 2, 2.5, 3]
    const tilts = ratios.map((r) => scaleTilt(10000, 10000 * r))
    for (let i = 1; i < tilts.length; i++) expect(tilts[i]).toBeGreaterThan(tilts[i - 1])
  })

  it('상한 경계: 정확히 상한 배율이면 최대, 넘어도 최대', () => {
    expect(scaleTilt(10000, 10000 * RATIO_CAP)).toBeCloseTo(MAX_TILT, 12)
    expect(scaleTilt(10000, 10000 * RATIO_CAP * 10)).toBe(MAX_TILT)
    expect(scaleTilt(10000, 10000 * RATIO_CAP - 1)).toBeLessThan(MAX_TILT)
  })

  it('하한 경계: 1/상한 배율이면 최소, 더 작아도 최소', () => {
    expect(scaleTilt(10000 * RATIO_CAP, 10000)).toBeCloseTo(-MAX_TILT, 12)
    expect(scaleTilt(10000, 1)).toBe(-MAX_TILT)
  })

  it('0원 처리', () => {
    expect(scaleTilt(0, 0)).toBe(0)
    expect(scaleTilt(0, 5000)).toBe(MAX_TILT)
    expect(scaleTilt(5000, 0)).toBe(-MAX_TILT)
  })

  it('음수, NaN, 무한대는 수평', () => {
    expect(scaleTilt(-1, 100)).toBe(0)
    expect(scaleTilt(100, -1)).toBe(0)
    expect(scaleTilt(Number.NaN, 100)).toBe(0)
    expect(scaleTilt(100, Number.POSITIVE_INFINITY)).toBe(0)
  })

  it('최대 기울기는 20도 안팎', () => {
    expect((MAX_TILT * 180) / Math.PI).toBeGreaterThan(15)
    expect((MAX_TILT * 180) / Math.PI).toBeLessThan(25)
  })
})

describe('scaleSide', () => {
  it('기울기 방향', () => {
    expect(scaleSide(10000, 12000)).toBe('converted')
    expect(scaleSide(10000, 8000)).toBe('spend')
    expect(scaleSide(10000, 10000)).toBe('level')
    expect(scaleSide(0, 0)).toBe('level')
    expect(scaleSide(Number.NaN, 1)).toBe('level')
  })
})
