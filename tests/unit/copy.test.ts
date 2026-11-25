// copy.ts 이용 안내 문구 검증
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { scanText } from '../../scripts/scan-banned.ts'
import { DISCLAIMER, ERROR_COPY, STORAGE_MEMORY_NOTICE, TAROT_NOTICE, guideSections } from '../../src/core/copy.ts'

const ROOT = resolve(import.meta.dirname, '../..')
const readList = (file: string) =>
  readFileSync(resolve(ROOT, 'scripts', file), 'utf8')
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith('#'))
const allow = new Set(readList('allow-tokens.txt'))
const banned = readList('banned-terms.txt')

const IMPERATIVE = /(세요|십시오|합시다|해라|읍시다)/
const sections = guideSections({ rates: '2025-10-31', returns: '2025-12-31' })
const all = sections.flatMap((s) => [s.title, ...s.paragraphs])

describe('이용 안내 문구', () => {
  it('섹션 5개: 소개, 데이터, 면책, 개인정보, 타로', () => {
    expect(sections.map((s) => s.id)).toEqual(['about', 'data', 'disclaimer', 'privacy', 'tarot'])
  })

  it('필수 내용 포함', () => {
    const text = all.join('\n')
    expect(text).toContain('재미 목적의 가정 시뮬레이션')
    expect(text).toContain('공개 통계')
    expect(text).toContain('가격 기준')
    for (const w of ['배당', '보수', '환율']) expect(text).toContain(w)
    expect(text).toContain(DISCLAIMER)
    expect(text).toContain('서버로 아무것도 전송하지 않습니다')
    expect(text).toContain('이 기기')
    expect(text).toContain('오락 콘텐츠')
  })

  it('기준일을 주입값으로 표시', () => {
    const data = sections.find((s) => s.id === 'data')!.paragraphs.join(' ')
    expect(data).toContain('2025-10-31')
    expect(data).toContain('2025-12-31')
  })

  it('권유 어미, 금칙어, 티커 의심 토큰 없음', () => {
    for (const t of all) {
      expect(t).not.toMatch(IMPERATIVE)
      expect(scanText(t, 'copy', allow, banned), t).toEqual([])
    }
  })
})

describe('타로 고지 문구', () => {
  it('오락 콘텐츠이며 환산과 기록에 무관함을 밝힌다', () => {
    expect(TAROT_NOTICE).toContain('재미로만 보는 오락 콘텐츠')
    expect(TAROT_NOTICE).toContain('환산 결과')
    expect(TAROT_NOTICE).toContain('소비 기록')
  })

  it('권유 어미, 금칙어 없음', () => {
    expect(TAROT_NOTICE).not.toMatch(IMPERATIVE)
    expect(scanText(TAROT_NOTICE, 'copy', allow, banned)).toEqual([])
  })
})

describe('오류와 저장소 안내 문구', () => {
  it('권유 어미, 금칙어 없음', () => {
    for (const t of [...Object.values(ERROR_COPY), STORAGE_MEMORY_NOTICE]) {
      expect(t).not.toMatch(IMPERATIVE)
      expect(scanText(t, 'copy', allow, banned), t).toEqual([])
    }
  })
})
