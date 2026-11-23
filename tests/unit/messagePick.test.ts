// messagePick.ts 단위 테스트
import { describe, expect, it } from 'vitest'
import { pickMessage } from '../../src/core/messagePick.ts'
import messages from '../../src/data/messages.json' with { type: 'json' }

describe('pickMessage', () => {
  it('카테고리와 금액 구간에 맞는 문구', () => {
    for (const r of [0, 0.3, 0.6, 0.999]) {
      const m = pickMessage(messages, 'hunger', 'mid', () => r)
      expect(m.category).toBe('hunger')
      expect(m.amountBand).toBe('mid')
    }
  })

  it('rand에 따라 톤이 달라짐', () => {
    const tones = new Set([0, 0.5, 0.99].map((r) => pickMessage(messages, 'stress', 'low', () => r).tone))
    expect(tones.size).toBe(3)
  })

  it('후보가 없으면 오류', () => {
    expect(() => pickMessage([], 'hunger', 'low', () => 0)).toThrow()
  })
})
