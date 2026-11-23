// coinCount.ts 단위 테스트
import { describe, expect, it } from 'vitest'
import { COIN_BASE, COIN_GROWTH, COIN_MAX, coinCount } from '../../src/core/coinCount.ts'

describe('coinCount', () => {
  it('0원과 0 결과는 0개', () => {
    expect(coinCount(0, 10000)).toBe(0)
    expect(coinCount(10000, 0)).toBe(0)
    expect(coinCount(0, 0)).toBe(0)
  })

  it('음수, NaN, 무한대는 0개', () => {
    expect(coinCount(-1, 100)).toBe(0)
    expect(coinCount(100, -1)).toBe(0)
    expect(coinCount(Number.NaN, 100)).toBe(0)
    expect(coinCount(100, Number.POSITIVE_INFINITY)).toBe(0)
  })

  it('배율 1배는 기본 개수', () => {
    expect(coinCount(10000, 10000)).toBe(COIN_BASE)
  })

  it('배율 1배 미만은 기본보다 적고 최소 1개', () => {
    expect(coinCount(10000, 5000)).toBe(5)
    expect(coinCount(10000, 9999)).toBe(10)
    expect(coinCount(10000, 100)).toBe(1)
    expect(coinCount(10000, 1)).toBe(1)
  })

  it('배율 1배 초과는 증가분 비례', () => {
    expect(coinCount(10000, 12500)).toBe(COIN_BASE + Math.round(0.25 * COIN_GROWTH))
    expect(coinCount(10000, 10288)).toBe(11)
  })

  it('상한 경계', () => {
    // 상한이 정확히 되는 배율
    const exact = 1 + (COIN_MAX - COIN_BASE) / COIN_GROWTH
    expect(coinCount(10000, Math.round(10000 * exact))).toBe(COIN_MAX)
    expect(coinCount(10000, 10000 * (exact + 0.5))).toBe(COIN_MAX)
    expect(coinCount(1, 1e9)).toBe(COIN_MAX)
  })

  it('배율이 커질수록 줄지 않음', () => {
    let prev = 0
    for (let v = 1000; v <= 40000; v += 500) {
      const n = coinCount(10000, v)
      expect(n).toBeGreaterThanOrEqual(prev)
      prev = n
    }
  })
})
