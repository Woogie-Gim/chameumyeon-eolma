// 모든 문구 × 모든 품목 렌더링 검사
import { describe, expect, it } from 'vitest'
import { OTHER_LABEL } from '../../src/core/copy.ts'
import { fillTemplate, hasBatchim, hasRieul } from '../../src/core/template.ts'
import items from '../../src/data/items.json' with { type: 'json' }
import messages from '../../src/data/messages.json' with { type: 'json' }

const LABELS = [...items.map((i) => i.label), OTHER_LABEL]
const AMOUNTS = ['18,000원', '1,000원', '100,000,000원']
const UNIT = /한 ?(판|잔|그릇|입|모금|마리|조각|개|병|상|끼|통장)(?![가-힣])|끼니/

// 단어 뒤에 붙은 조사가 받침과 맞는지 검사. 틀린 형태를 찾으면 반환
function wrongParticle(text: string, word: string): string | null {
  const batchim = hasBatchim(word)
  const rieul = hasRieul(word)
  const bad = batchim
    ? ['가', '를', '는', '와', '라', '였', ...(rieul ? ['으로'] : ['로'])]
    : ['이 ', '이,', '이.', '을', '은', '과', '으로', '이라', '이었']
  let from = 0
  for (;;) {
    const i = text.indexOf(word, from)
    if (i < 0) return null
    const rest = text.slice(i + word.length)
    // 단어 일부로 이어지는 경우(예: 치킨 → 치킨집)는 사전 label 특성상 없음
    for (const b of bad) if (rest.startsWith(b)) return word + b
    from = i + word.length
  }
}

describe('문구 렌더링', () => {
  it('조합마다 정확히 8개', () => {
    const count = new Map<string, number>()
    for (const m of messages) {
      const k = `${m.category}-${m.amountBand}-${m.tone}`
      count.set(k, (count.get(k) ?? 0) + 1)
    }
    expect(count.size).toBe(36)
    for (const [k, n] of count) expect(n, k).toBe(8)
  })

  it('단위 표현 없음', () => {
    for (const m of messages) expect(m.template, m.id).not.toMatch(UNIT)
  })

  it('모든 품목 대입 시 자리표시자 없음, 조사 일치', () => {
    for (const m of messages) {
      for (const item of LABELS) {
        for (const amount of AMOUNTS) {
          const s = fillTemplate(m.template, { item, amount, years: 10, future: amount })
          expect(s, m.id).not.toMatch(/[{}]/)
          if (m.template.includes('{item}')) expect(wrongParticle(s, item), `${m.id} ${s}`).toBeNull()
          expect(wrongParticle(s, amount), `${m.id} ${s}`).toBeNull()
        }
      }
    }
  })

  it('원 뒤에 받침 없는 조사형 없음', () => {
    for (const m of messages) {
      const s = fillTemplate(m.template, { item: '치킨', amount: '18,000원', years: 10, future: '23,940원' })
      expect(s, m.id).not.toMatch(/원(가 |가,|를|는|와|로 |라|예요|였)/)
    }
  })

  it('받침 없는 값이 오면 조사도 바뀜', () => {
    expect(fillTemplate('{amount}을 {future}과', { amount: '천 원 정도', future: '만 원 정도' })).toBe('천 원 정도를 만 원 정도와')
    expect(fillTemplate('{future}으로', { future: '커피' })).toBe('커피로')
  })
})
