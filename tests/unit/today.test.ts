// today.ts 단위 테스트. 날짜 키가 바뀔 때만 새 날짜
import { describe, expect, it } from 'vitest'
import { toDateKey } from '../../src/core/stats.ts'
import { nextToday } from '../../src/core/today.ts'
import { resolveToday } from '../../src/core/tarot.ts'

describe('nextToday', () => {
  it('같은 날이면 이전 객체 그대로', () => {
    const prev = new Date(2026, 10, 25, 9, 0)
    expect(nextToday(prev, new Date(2026, 10, 25, 23, 59))).toBe(prev)
  })

  it('자정을 넘기면 새 날짜', () => {
    const prev = new Date(2026, 10, 25, 23, 59)
    const now = new Date(2026, 10, 26, 0, 1)
    expect(nextToday(prev, now)).toBe(now)
  })

  it('월과 연 경계', () => {
    expect(toDateKey(nextToday(new Date(2026, 10, 30, 23), new Date(2026, 11, 1, 0)))).toBe('2026-12-01')
    expect(toDateKey(nextToday(new Date(2026, 11, 31, 23), new Date(2027, 0, 1, 0)))).toBe('2027-01-01')
  })

  it('기기 시계가 뒤로 가도 날짜 키가 다르면 따라간다', () => {
    const now = new Date(2026, 10, 24, 12)
    expect(nextToday(new Date(2026, 10, 25, 12), now)).toBe(now)
  })

  it('타로 오늘의 카드 고정은 갱신된 날짜 키를 따른다', () => {
    const before = nextToday(new Date(2026, 10, 25, 23, 59), new Date(2026, 10, 25, 23, 59, 30))
    const stored = { date: toDateKey(before), cardId: 7 }
    expect(resolveToday(stored, toDateKey(before))).toBe(7)
    const after = nextToday(before, new Date(2026, 10, 26, 0, 1))
    expect(resolveToday(stored, toDateKey(after))).toBeNull()
  })
})
