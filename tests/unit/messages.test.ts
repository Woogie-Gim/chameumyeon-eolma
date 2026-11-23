// messages.json, tarot.json 스키마 검증
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { scanText } from '../../scripts/scan-banned.ts'
import messages from '../../src/data/messages.json' with { type: 'json' }
import messagesEtf from '../../src/data/messagesEtf.json' with { type: 'json' }
import tarot from '../../src/data/tarot.json' with { type: 'json' }

const ROOT = resolve(import.meta.dirname, '../..')
const CATEGORIES = ['hunger', 'stress', 'reward', 'impulse']
const BANDS = ['low', 'mid', 'high']
const TONES = ['funny', 'calm', 'stern']
const MAX_LEN = 60

// 권유와 명령 어미
const IMPERATIVE = /(세요|십시오|합시다|하자[.!?]?$|해라|하라[.!?]?$|읍시다)/
const EMOJI = /\p{Extended_Pictographic}/u
// 단정적 예언 표현
// 과장 표현과 특정 품목에만 맞는 비유
const HYPE = /(놀랄|놀라운|깜짝|마술|변신|하늘을 날|의자에서|부자|대식가|파티|만찬|한정판|숙성|반짝|간식|배꼽|야식|오늘 밤|오늘 저녁|장바구니|결제 버튼|할부|냄새|배달|달콤|눈을 크게|질투|소매|기침|목청|박빙|귀여운|스티커|득템|배는 하나)/
const DEFINITE = /(반드시|무조건|틀림없이|것이다|확실히|100%)/

function readList(file: string) {
  return readFileSync(resolve(ROOT, 'scripts', file), 'utf8')
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith('#'))
}
const allow = new Set(readList('allow-tokens.txt'))
const banned = readList('banned-terms.txt')

function commonChecks(text: string, allowed: string[]) {
  const placeholders = text.match(/\{[^}]*\}/g) ?? []
  for (const p of placeholders) expect(allowed, text).toContain(p)
  expect(text.replace(/\{[^}]*\}/g, ''), text).not.toMatch(/[{}]/)
  expect(text, text).not.toMatch(/\d/)
  expect(text.length, text).toBeLessThanOrEqual(MAX_LEN)
  expect(text, text).not.toMatch(EMOJI)
  expect(text, text).not.toMatch(IMPERATIVE)
  expect(scanText(text, 'messages', allow, banned), text).toEqual([])
}

describe('messages.json', () => {
  it('필드와 값 범위', () => {
    for (const m of messages) {
      expect(Object.keys(m).sort()).toEqual(['amountBand', 'category', 'id', 'template', 'tone'])
      expect(CATEGORIES).toContain(m.category)
      expect(BANDS).toContain(m.amountBand)
      expect(TONES).toContain(m.tone)
      expect(m.id).toMatch(/^[a-z]+-[a-z]+-[a-z]+-\d{2}$/)
    }
  })

  it('id와 문구 중복 없음', () => {
    expect(new Set(messages.map((m) => m.id)).size).toBe(messages.length)
    expect(new Set(messages.map((m) => m.template)).size).toBe(messages.length)
  })

  it('조합마다 8개 이상', () => {
    for (const c of CATEGORIES)
      for (const b of BANDS)
        for (const t of TONES) {
          const n = messages.filter((m) => m.category === c && m.amountBand === b && m.tone === t).length
          expect(n, `${c}-${b}-${t}`).toBeGreaterThanOrEqual(8)
        }
  })

  it('문구 규칙: 자리표시자, 숫자, 길이, 이모지, 권유 어미, 금칙어', () => {
    for (const m of messages) commonChecks(m.template, ['{item}', '{amount}', '{years}', '{future}'])
  })

  it('자리표시자를 하나 이상 사용', () => {
    for (const m of messages) expect(m.template, m.template).toMatch(/\{(item|amount|years|future)\}/)
  })
})

describe('tarot.json', () => {
  it('22장, id 0~21, 이름 중복 없음', () => {
    expect(tarot.length).toBe(22)
    expect(tarot.map((t) => t.id)).toEqual([...Array(22).keys()])
    expect(new Set(tarot.map((t) => t.name)).size).toBe(22)
  })

  it('필드', () => {
    for (const t of tarot) {
      expect(Object.keys(t).sort()).toEqual(['adviceTemplate', 'id', 'keyword', 'name'])
      expect(t.name.length).toBeGreaterThan(0)
      expect(t.keyword.length).toBeGreaterThan(0)
    }
  })

  it('문구 규칙과 단정 표현 금지', () => {
    for (const t of tarot) {
      commonChecks(t.adviceTemplate, ['{amount}'])
      commonChecks(t.name, [])
      commonChecks(t.keyword, [])
      expect(t.adviceTemplate, t.adviceTemplate).not.toMatch(DEFINITE)
    }
  })
})

describe('과장과 품목 한정 비유 없음', () => {
  it('일반 풀과 ETF 풀', () => {
    for (const m of [...messages, ...messagesEtf]) expect(m.template, m.id).not.toMatch(HYPE)
  })
})

describe('messagesEtf.json', () => {
  it('필드와 값 범위', () => {
    for (const m of messagesEtf) {
      expect(Object.keys(m).sort()).toEqual(['category', 'id', 'template', 'tone'])
      expect(CATEGORIES).toContain(m.category)
      expect(TONES).toContain(m.tone)
      expect(m.id).toMatch(/^etf-[a-z]+-[a-z]+-\d{2}$/)
    }
  })

  it('id와 문구 중복 없음', () => {
    expect(new Set(messagesEtf.map((m) => m.id)).size).toBe(messagesEtf.length)
    expect(new Set(messagesEtf.map((m) => m.template)).size).toBe(messagesEtf.length)
  })

  it('카테고리 x 톤 조합마다 4개 이상', () => {
    for (const c of CATEGORIES)
      for (const t of TONES) {
        const n = messagesEtf.filter((m) => m.category === c && m.tone === t).length
        expect(n, `${c}-${t}`).toBeGreaterThanOrEqual(4)
      }
  })

  it('문구 규칙: 자리표시자, 숫자, 길이, 이모지, 권유 어미, 금칙어', () => {
    for (const m of messagesEtf) commonChecks(m.template, ['{item}', '{amount}', '{startYear}', '{future}'])
  })

  it('과거 시제: 미래 표현과 성장 단정 없음, {startYear} 뒤에는 년', () => {
    for (const m of messagesEtf) {
      expect(m.template, m.id).not.toMatch(/\{years\}|뒤에|뒤엔|년 뒤|자라|자랐|늘어|불어|여유/)
      expect(m.template, m.id).toMatch(/\{future\}/)
      for (const s of m.template.matchAll(/\{startYear\}(.)/g)) expect(s[1], m.id).toBe('년')
    }
  })
})
