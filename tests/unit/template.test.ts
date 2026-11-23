// template.ts 단위 테스트
import { describe, expect, it } from 'vitest'
import { fillTemplate, hasBatchim } from '../../src/core/template.ts'
import messages from '../../src/data/messages.json' with { type: 'json' }

const vars = (item: string) => ({ item, amount: '18,000원', years: 10, future: '23,940원' })

describe('hasBatchim', () => {
  it('받침 판정', () => {
    expect(hasBatchim('치킨')).toBe(true)
    expect(hasBatchim('커피')).toBe(false)
    expect(hasBatchim('술')).toBe(true)
  })
})

describe('fillTemplate', () => {
  it('자리표시자 치환', () => {
    expect(fillTemplate('{amount}, {years}년 뒤 {future}', vars('치킨'))).toBe('18,000원, 10년 뒤 23,940원')
  })

  it('받침 따라 조사 선택', () => {
    expect(fillTemplate('{item}이 좋다', vars('커피'))).toBe('커피가 좋다')
    expect(fillTemplate('{item}이 좋다', vars('치킨'))).toBe('치킨이 좋다')
    expect(fillTemplate('{item}을 본다', vars('피자'))).toBe('피자를 본다')
    expect(fillTemplate('{item}은 맛있다', vars('피자'))).toBe('피자는 맛있다')
    expect(fillTemplate('{item}과 통장', vars('커피'))).toBe('커피와 통장')
    expect(fillTemplate('{item}으로 푼다', vars('커피'))).toBe('커피로 푼다')
    expect(fillTemplate('{item}으로 푼다', vars('술'))).toBe('술로 푼다')
    expect(fillTemplate('{item}으로 푼다', vars('치킨'))).toBe('치킨으로 푼다')
    expect(fillTemplate('{item}이라면', vars('커피'))).toBe('커피라면')
    expect(fillTemplate('{item}이었다면', vars('커피'))).toBe('커피였다면')
    expect(fillTemplate('{item}인지', vars('커피'))).toBe('커피인지')
  })

  it('모든 문구에 자리표시자가 남지 않음', () => {
    for (const m of messages) {
      for (const item of ['치킨', '커피', '술']) {
        expect(fillTemplate(m.template, vars(item))).not.toMatch(/[{}]/)
      }
    }
  })
})
