// stats.ts 단위 테스트
import { describe, expect, it } from 'vitest'
import { streakDays, toDateKey, totalSaved, weeklySaved, type LogRecord } from '../../src/core/stats.ts'

const rec = (date: string, amount: number, choice: 'saved' | 'spent' = 'saved'): LogRecord => ({
  date,
  itemId: 'chicken',
  amount,
  choice,
})
const today = new Date(2026, 10, 23) // 2026-11-23 로컬

describe('toDateKey', () => {
  it('로컬 날짜 YYYY-MM-DD', () => {
    expect(toDateKey(today)).toBe('2026-11-23')
    expect(toDateKey(new Date(2026, 0, 5))).toBe('2026-01-05')
  })
})

describe('totalSaved', () => {
  it('참았어요만 합산', () => {
    expect(totalSaved([])).toBe(0)
    expect(totalSaved([rec('2026-11-23', 18000), rec('2026-11-22', 5000, 'spent'), rec('2026-11-21', 4500)])).toBe(22500)
  })
})

describe('streakDays', () => {
  it('기록 없음 0', () => {
    expect(streakDays([], today)).toBe(0)
  })

  it('오늘까지 연속', () => {
    const r = [rec('2026-11-23', 1), rec('2026-11-22', 1), rec('2026-11-21', 1), rec('2026-11-19', 1)]
    expect(streakDays(r, today)).toBe(3)
  })

  it('오늘 기록이 없으면 어제부터 센다', () => {
    expect(streakDays([rec('2026-11-22', 1), rec('2026-11-21', 1)], today)).toBe(2)
  })

  it('어제도 없으면 0', () => {
    expect(streakDays([rec('2026-11-21', 1)], today)).toBe(0)
  })

  it('먹었어요만 있는 날은 끊김, 같은 날 중복은 하루', () => {
    const r = [rec('2026-11-23', 1), rec('2026-11-23', 1), rec('2026-11-22', 1, 'spent'), rec('2026-11-21', 1)]
    expect(streakDays(r, today)).toBe(1)
  })

  it('월 경계', () => {
    const d = new Date(2026, 11, 1)
    expect(streakDays([rec('2026-12-01', 1), rec('2026-11-30', 1), rec('2026-11-29', 1)], d)).toBe(3)
  })
})

describe('weeklySaved', () => {
  it('최근 7일, 오래된 날부터, 참았어요만', () => {
    const r = [
      rec('2026-11-23', 1000),
      rec('2026-11-23', 500),
      rec('2026-11-20', 3000),
      rec('2026-11-20', 9999, 'spent'),
      rec('2026-11-16', 7000), // 범위 밖
    ]
    const w = weeklySaved(r, today)
    expect(w.map((d) => d.date)).toEqual([
      '2026-11-17', '2026-11-18', '2026-11-19', '2026-11-20', '2026-11-21', '2026-11-22', '2026-11-23',
    ])
    expect(w.map((d) => d.amount)).toEqual([0, 0, 0, 3000, 0, 0, 1500])
  })
})
