// tarot.ts 단위 테스트. 5장 무작위 펼침, 오늘의 카드 고정, 부채꼴 배치, 문구와 금칙어
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it, vi } from 'vitest'
import { scanText } from '../../scripts/scan-banned.ts'
import { TAROT_NOTICE } from '../../src/core/copy.ts'
import { SPREAD_CARD_W, SPREAD_MIN_STEP, SPREAD_SIZE, TAROT_COUNT, drawSpread, resolveToday, spreadLayout, tarotCard, tiltedWidth } from '../../src/core/tarot.ts'
import { HOVER_LIFT, PICK_LIFT, liftOf } from '../../src/scenes/spreadMotion.ts'
import tarot from '../../src/data/tarot.json' with { type: 'json' }

const ROOT = resolve(import.meta.dirname, '../..')
const readList = (file: string) =>
  readFileSync(resolve(ROOT, 'scripts', file), 'utf8')
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith('#'))

// 고정 시드 난수(mulberry32). 테스트에서 Math.random 대신 주입
function seeded(seed: number) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

describe('drawSpread', () => {
  it('카드 수는 tarot.json과 같고 펼침은 5장', () => {
    expect(TAROT_COUNT).toBe(tarot.length)
    expect(SPREAD_SIZE).toBe(5)
  })

  it('항상 서로 다른 5장, 모두 0~21 정수', () => {
    for (let seed = 1; seed <= 200; seed++) {
      const ids = drawSpread(seeded(seed))
      expect(ids).toHaveLength(5)
      expect(new Set(ids).size).toBe(5)
      for (const id of ids) {
        expect(Number.isInteger(id)).toBe(true)
        expect(id).toBeGreaterThanOrEqual(0)
        expect(id).toBeLessThan(TAROT_COUNT)
      }
    }
  })

  it('같은 난수열이면 같은 결과', () => {
    expect(drawSpread(seeded(42))).toEqual(drawSpread(seeded(42)))
  })

  it('시드가 바뀌면 고르는 카드와 순서가 달라진다', () => {
    const results = new Set(Array.from({ length: 50 }, (_, i) => drawSpread(seeded(i + 1)).join(',')))
    expect(results.size).toBeGreaterThan(45)
  })

  it('여러 번 뽑으면 22장이 모두 나온다', () => {
    const seen = new Set<number>()
    for (let seed = 1; seed <= 200; seed++) for (const id of drawSpread(seeded(seed))) seen.add(id)
    expect(seen.size).toBe(TAROT_COUNT)
  })

  it('경계 난수(0, 1에 가까운 값, 1, NaN)에도 범위 안', () => {
    for (const v of [0, 0.9999999, 1, Number.NaN, -1]) {
      const ids = drawSpread(() => v)
      expect(new Set(ids).size).toBe(5)
      for (const id of ids) expect(id).toBeLessThan(TAROT_COUNT)
    }
  })

  it('기본값은 Math.random을 쓴다', () => {
    const spy = vi.spyOn(Math, 'random').mockReturnValue(0)
    expect(drawSpread()).toEqual([0, 1, 2, 3, 4])
    expect(spy).toHaveBeenCalledTimes(5)
    spy.mockRestore()
  })
})

describe('resolveToday', () => {
  const today = '2026-11-25'

  it('저장 없음이면 null(아직 안 고름)', () => {
    expect(resolveToday(null, today)).toBeNull()
  })

  it('오늘 고른 기록이 있으면 그 카드로 고정', () => {
    expect(resolveToday({ date: today, cardId: 3 }, today)).toBe(3)
  })

  it('어제 기록이면 null(오늘 다시 고름)', () => {
    expect(resolveToday({ date: '2026-11-24', cardId: 3 }, today)).toBeNull()
  })

  it('잘못된 id는 무시', () => {
    expect(resolveToday({ date: today, cardId: 99 }, today)).toBeNull()
    expect(resolveToday({ date: today, cardId: -1 }, today)).toBeNull()
    expect(resolveToday({ date: today, cardId: 1.5 }, today)).toBeNull()
  })
})

describe('spreadLayout', () => {
  // 모바일 390px 화면의 무대 폭(좌우 여백 제외)과 좁은 320px 화면
  it.each([350, 280])('무대 폭 %ipx 안에 기울어진 바깥 카드까지 5장이 들어간다', (w) => {
    const slots = spreadLayout(5, w)
    for (const sl of slots) {
      const half = tiltedWidth(sl.rot) / 2
      expect(sl.x - half).toBeGreaterThanOrEqual(-w / 2)
      expect(sl.x + half).toBeLessThanOrEqual(w / 2)
    }
  })

  it('넓으면 기울기를 그대로, 좁으면 줄인다', () => {
    expect(spreadLayout(5, 350)[4].rot).toBeGreaterThan(spreadLayout(5, 280)[4].rot)
    expect(spreadLayout(5, 280)[4].rot).toBeGreaterThanOrEqual(0)
  })

  it('기울어진 폭: 0도면 카드 폭, 기울면 넓어진다', () => {
    expect(tiltedWidth(0)).toBeCloseTo(SPREAD_CARD_W)
    expect(tiltedWidth(14)).toBeGreaterThan(SPREAD_CARD_W)
    expect(tiltedWidth(-14)).toBeCloseTo(tiltedWidth(14))
  })

  it.each([350, 280, 240])('무대 폭 %ipx에서도 카드마다 보이는 폭이 44px 이상', (w) => {
    const slots = spreadLayout(5, w)
    for (let i = 1; i < slots.length; i++) expect(slots[i].x - slots[i - 1].x).toBeGreaterThanOrEqual(SPREAD_MIN_STEP)
  })

  it('가운데 기준 좌우 대칭 부채꼴', () => {
    const slots = spreadLayout(5, 350)
    expect(slots[2]).toEqual({ x: 0, y: 0, rot: 0 })
    expect(slots[0].x).toBeCloseTo(-slots[4].x)
    expect(slots[0].rot).toBeCloseTo(-slots[4].rot)
    expect(slots[0].y).toBeGreaterThan(slots[1].y)
  })

  it('1장과 0장', () => {
    expect(spreadLayout(1, 350)).toEqual([{ x: 0, y: 0, rot: 0 }])
    expect(spreadLayout(0, 350)).toEqual([])
  })
})

describe('liftOf', () => {
  it('고르기 전에는 가리킨 카드만, 고른 뒤에는 고른 카드만 올라온다', () => {
    expect(liftOf(1, null, 1)).toBe(HOVER_LIFT)
    expect(liftOf(2, null, 1)).toBe(0)
    expect(liftOf(3, 3, 1)).toBe(PICK_LIFT)
    expect(liftOf(1, 3, 1)).toBe(0)
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
