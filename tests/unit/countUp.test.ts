// countUp.ts 단위 테스트. 보간 곡선, 경계, 정수 반올림, 시간 상한
import { describe, expect, it } from 'vitest'
import { COUNT_UP_CHANGE_MS, COUNT_UP_FIRST_MS, countUpAt, easeOutCubic } from '../../src/core/countUp.ts'

describe('easeOutCubic', () => {
  it('0과 1은 그대로, 범위 밖은 잘라낸다', () => {
    expect(easeOutCubic(0)).toBe(0)
    expect(easeOutCubic(1)).toBe(1)
    expect(easeOutCubic(-1)).toBe(0)
    expect(easeOutCubic(2)).toBe(1)
  })

  it('단조 증가하고 처음이 빠르다', () => {
    let prev = 0
    for (let t = 0.1; t <= 1; t += 0.1) {
      const v = easeOutCubic(t)
      expect(v).toBeGreaterThanOrEqual(prev)
      prev = v
    }
    expect(easeOutCubic(0.5)).toBeGreaterThan(0.5)
  })
})

describe('countUpAt', () => {
  it('시작은 from, 끝은 to', () => {
    expect(countUpAt(0, 12345, 0)).toBe(0)
    expect(countUpAt(0, 12345, 1)).toBe(12345)
    expect(countUpAt(0, 12345, 5)).toBe(12345)
  })

  it('중간값은 정수이고 범위 안', () => {
    for (let t = 0.05; t < 1; t += 0.05) {
      const v = countUpAt(1000, 2000, t)
      expect(Number.isInteger(v)).toBe(true)
      expect(v).toBeGreaterThanOrEqual(1000)
      expect(v).toBeLessThanOrEqual(2000)
    }
  })

  it('줄어드는 방향도 보간', () => {
    const v = countUpAt(2000, 1000, 0.5)
    expect(v).toBeLessThan(2000)
    expect(v).toBeGreaterThan(1000)
  })

  it('잘못된 시간 비율이면 목표값', () => {
    expect(countUpAt(0, 500, Number.NaN)).toBe(500)
  })

  it('처음 공개는 1초 안', () => {
    expect(COUNT_UP_FIRST_MS).toBeLessThanOrEqual(1000)
    expect(COUNT_UP_CHANGE_MS).toBeLessThan(COUNT_UP_FIRST_MS)
  })
})
