// inputFilter 단위 테스트. tests/는 금칙어 스캔 대상이 아니므로 실제 상호명을 사용
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { filterInput, hashTerm, normalize, type FilterResult } from '../../src/core/inputFilter.ts'
import items from '../../src/data/items.json' with { type: 'json' }
import blocked from '../../src/data/blockedHashes.json' with { type: 'json' }

const ROOT = resolve(import.meta.dirname, '../..')

// 원문이 결과 어디에도 없는지 확인
function expectNoRaw(raw: string, r: FilterResult) {
  const s = JSON.stringify(r)
  expect(s).not.toContain(raw)
  const n = normalize(raw)
  if (n.length >= 2 && !r.status.startsWith('allowed')) expect(s).not.toContain(n)
}

describe('상호명 거부', () => {
  const brands = ['스타벅스', '교촌치킨', '맥도날드', '배달의민족', '엽기떡볶이', '메가커피', '버거킹', '국민은행']
  for (const b of brands) {
    it(b, () => {
      const r = filterInput(b)
      expect(r.status).toBe('rejected')
      if (r.status === 'rejected') {
        expect(r.reason).toBe('brand')
        expect(r.message).toMatch(/일반 명칭/)
      }
      expectNoRaw(b, r)
    })
  }

  it('띄어쓰기와 수식어가 섞여도 거부', () => {
    for (const raw of ['스타 벅스', '교촌 치킨 2마리', '아이스 스타벅스']) {
      const r = filterInput(raw)
      expect(r.status).toBe('rejected')
      expectNoRaw(raw, r)
    }
  })

  it('사전에 없는 상호 형태(고유명+품목명)도 거부', () => {
    for (const raw of ['철수네치킨', '영희분식', '할매떡볶이']) {
      const r = filterInput(raw)
      expect(r.status).toBe('rejected')
      if (r.status === 'rejected') expect(r.reason).toBe('brand')
      expectNoRaw(raw, r)
    }
  })

  it('영문 입력 거부', () => {
    for (const raw of ['Starbucks', 'coffee', 'BBQ치킨']) {
      const r = filterInput(raw)
      expect(r.status).toBe('rejected')
      if (r.status === 'rejected') expect(r.reason).toBe('latin')
      expectNoRaw(raw, r)
    }
  })
})

describe('일반 명칭 허용', () => {
  it('대표 품목', () => {
    const cases: [string, string][] = [
      ['치킨', 'chicken'],
      ['커피', 'coffee'],
      ['떡볶이', 'tteokbokki'],
      ['아아', 'coffee'],
      ['커피 2잔', 'coffee'],
      ['아이스 아메리카노', 'coffee'],
      ['양념치킨', 'chicken'],
      ['치킨 한 마리', 'chicken'],
    ]
    for (const [raw, id] of cases) {
      const r = filterInput(raw)
      expect(r.status, raw).toBe('allowed')
      if (r.status === 'allowed') expect(r.itemId).toBe(id)
    }
  })

  it('사전의 모든 label과 alias 허용(금칙어와 충돌 없음)', () => {
    for (const it_ of items) {
      for (const word of [it_.label, ...it_.aliases]) {
        const r = filterInput(word)
        expect(r.status, word).toBe('allowed')
        if (r.status === 'allowed') expect(r.itemId, word).toBe(it_.id)
      }
    }
  })
})

describe('기타 소비', () => {
  it('사전에 없는 단어', () => {
    for (const raw of ['우주여행', '고양이털', '뭔가']) {
      const r = filterInput(raw)
      expect(r.status, raw).toBe('other')
      if (r.status === 'other') {
        expect(r.label).toBe('기타 소비')
        expect(r.itemId).toBe('other')
      }
      expectNoRaw(raw, r)
    }
  })
})

describe('형식 검사', () => {
  it('빈 입력 거부', () => {
    for (const raw of ['', '   ', '!!!']) {
      const r = filterInput(raw)
      expect(r.status).toBe('rejected')
      if (r.status === 'rejected') expect(r.reason).toBe('empty')
    }
  })

  it('21자 이상 거부', () => {
    const raw = '가'.repeat(21)
    const r = filterInput(raw)
    expect(r.status).toBe('rejected')
    if (r.status === 'rejected') expect(r.reason).toBe('tooLong')
    expectNoRaw(raw, r)
  })
})

describe('반환값에 원문 미포함', () => {
  it('허용 결과는 사전 label만 포함', () => {
    const raw = '아이스 아메리카노 2잔'
    const r = filterInput(raw)
    expect(r.status).toBe('allowed')
    expect(JSON.stringify(r)).not.toContain(raw)
    expect(Object.keys(r).sort()).toEqual(['category', 'itemId', 'label', 'status'])
  })

  it('거부와 기타 결과의 키 고정', () => {
    expect(Object.keys(filterInput('스타벅스')).sort()).toEqual(['message', 'reason', 'status'])
    expect(Object.keys(filterInput('우주여행')).sort()).toEqual(['category', 'itemId', 'label', 'status'])
  })
})

describe('items.json 스키마', () => {
  it('60개 이상, 카테고리 4종, id 중복 없음', () => {
    expect(items.length).toBeGreaterThanOrEqual(60)
    expect(new Set(items.map((i) => i.id)).size).toBe(items.length)
    const cats = new Set(items.map((i) => i.category))
    expect([...cats].sort()).toEqual(['hunger', 'impulse', 'reward', 'stress'])
  })

  it('label과 alias 중복 없음, 영문 없음', () => {
    const words = items.flatMap((i) => [i.label, ...i.aliases].map(normalize))
    expect(new Set(words).size).toBe(words.length)
    for (const w of words) expect(w).not.toMatch(/[a-z]/i)
  })
})

describe('금칙어 해시 동기화', () => {
  it('banned-terms.txt와 blockedHashes.json 일치(불일치 시 npm run build:blocklist)', () => {
    const terms = readFileSync(resolve(ROOT, 'scripts/banned-terms.txt'), 'utf8')
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter((l) => l && !l.startsWith('#'))
    const expected = [...new Set(terms.map(normalize).filter((t) => t.length > 0).map(hashTerm))].sort()
    expect(blocked.hashes).toEqual(expected)
  })
})
