// tarot.ts 단위 테스트. 날짜 시드 결정성, 하루 한 장 판정, 문구 치환과 금칙어
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { scanText } from '../../scripts/scan-banned.ts'
import { TAROT_NOTICE } from '../../src/core/copy.ts'
import { toDateKey } from '../../src/core/stats.ts'
import { TAROT_COUNT, dailyCardId, resolveToday, tarotCard } from '../../src/core/tarot.ts'
import tarot from '../../src/data/tarot.json' with { type: 'json' }

const ROOT = resolve(import.meta.dirname, '../..')
const readList = (file: string) =>
  readFileSync(resolve(ROOT, 'scripts', file), 'utf8')
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith('#'))

function daysOf(year: number): string[] {
  const out: string[] = []
  for (let d = new Date(year, 0, 1); d.getFullYear() === year; d.setDate(d.getDate() + 1)) out.push(toDateKey(d))
  return out
}

describe('dailyCardId', () => {
  it('카드 수는 tarot.json과 같다', () => {
    expect(TAROT_COUNT).toBe(tarot.length)
  })

  it('같은 날짜는 항상 같은 카드', () => {
    for (const key of ['2026-11-25', '2027-01-01', '2030-12-31']) {
      const first = dailyCardId(key)
      for (let i = 0; i < 5; i++) expect(dailyCardId(key)).toBe(first)
    }
  })

  it('기준 구현(FNV-1a)과 일치', () => {
    for (const key of daysOf(2026)) expect(dailyCardId(key)).toBe(dailyCardIdReference(key))
  })

  it('항상 0~21 정수', () => {
    for (const key of daysOf(2026)) {
      const id = dailyCardId(key)
      expect(Number.isInteger(id)).toBe(true)
      expect(id).toBeGreaterThanOrEqual(0)
      expect(id).toBeLessThan(TAROT_COUNT)
    }
  })

  it('1년 동안 여러 카드가 나온다', () => {
    const ids = new Set(daysOf(2026).map((k) => dailyCardId(k)))
    expect(ids.size).toBeGreaterThanOrEqual(18)
  })

  it('날짜가 바뀌면 대부분 다른 카드', () => {
    const days = daysOf(2026)
    let changed = 0
    for (let i = 1; i < days.length; i++) if (dailyCardId(days[i]) !== dailyCardId(days[i - 1])) changed++
    expect(changed / (days.length - 1)).toBeGreaterThan(0.85)
  })
})

describe('resolveToday', () => {
  const today = '2026-11-25'

  it('저장 없음이면 오늘 시드 카드, 아직 안 뽑음', () => {
    expect(resolveToday(null, today)).toEqual({ cardId: dailyCardId(today), drawn: false })
  })

  it('오늘 뽑은 기록이 있으면 그 카드', () => {
    expect(resolveToday({ date: today, cardId: 3 }, today)).toEqual({ cardId: 3, drawn: true })
  })

  it('어제 기록이면 오늘 새 카드, 아직 안 뽑음', () => {
    const r = resolveToday({ date: '2026-11-24', cardId: 3 }, today)
    expect(r).toEqual({ cardId: dailyCardId(today), drawn: false })
  })

  it('잘못된 id는 무시', () => {
    expect(resolveToday({ date: today, cardId: 99 }, today)).toEqual({ cardId: dailyCardId(today), drawn: false })
    expect(resolveToday({ date: today, cardId: -1 }, today).drawn).toBe(false)
    expect(resolveToday({ date: today, cardId: 1.5 }, today).drawn).toBe(false)
  })
})

describe('타로 조언과 카드 조회', () => {
  it('조언은 자리표시자와 숫자 없이 그대로 읽힌다', () => {
    for (const card of tarot) {
      expect(card.adviceTemplate, card.adviceTemplate).not.toMatch(/[{}]/)
      expect(card.adviceTemplate, card.adviceTemplate).not.toMatch(/\d/)
    }
  })

  it('다시 쓴 조언 id는 그대로', () => {
    expect(tarotCard(1).name).toBe('동전 마법사')
    expect(tarotCard(8).name).toBe('참을성의 사자')
    expect(tarotCard(21).name).toBe('완성된 지갑')
  })

  it('카드 조회는 범위 밖이면 0번', () => {
    expect(tarotCard(5).id).toBe(5)
    expect(tarotCard(99).id).toBe(0)
  })
})

describe('타로 금칙어 스캔', () => {
  const allow = new Set(readList('allow-tokens.txt'))
  const banned = readList('banned-terms.txt')

  it('카드 이름, 키워드, 조언, 고지 문구 위반 0건', () => {
    const texts = [TAROT_NOTICE, ...tarot.flatMap((t) => [t.name, t.keyword, t.adviceTemplate])]
    expect(texts.flatMap((t) => scanText(t, 'tarot', allow, banned))).toEqual([])
  })

  it('고지 문구는 오락 콘텐츠임을 밝힌다', () => {
    expect(TAROT_NOTICE).toContain('재미로만 보는 오락 콘텐츠')
  })
})

// 기준 구현: FNV-1a 32비트
function dailyCardIdReference(key: string): number {
  let h = 0x811c9dc5
  for (let i = 0; i < key.length; i++) {
    h ^= key.charCodeAt(i)
    h = Math.imul(h, 0x01000193) >>> 0
  }
  return h % 22
}
