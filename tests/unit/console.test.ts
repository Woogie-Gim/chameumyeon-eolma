// 앱인토스 콘솔 입력값: 금칙어 없음, 문서 표가 원본과 같음, 주요 기능 주소가 앱 경로로 열림
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { END, START, buildBlock, readFields, scanFields } from '../../scripts/console-fields.ts'
import { pathToScreen } from '../../src/core/route.ts'

const fields = readFields()

describe('콘솔 입력값', () => {
  it('모든 문구가 금칙어 스캔을 통과', () => {
    expect(scanFields(fields)).toEqual([])
  })

  it('SUBMISSION.md 표시 구간이 console.json으로 만든 결과와 같다(npm run store:console)', () => {
    const doc = readFileSync(resolve(import.meta.dirname, '../../docs/SUBMISSION.md'), 'utf8').replace(/\r\n/g, '\n')
    const block = doc.slice(doc.indexOf(START), doc.indexOf(END) + END.length)
    expect(block).toBe(buildBlock(fields))
  })

  it('주요 기능 주소는 앱 이름 스킴이고 앱 경로로 화면이 열린다', () => {
    expect(fields.features).toHaveLength(3)
    const screens = fields.features.map((f) => {
      const m = /^intoss:\/\/chameumyeon-eolma(\/.*)$/.exec(f.url)
      expect(m, f.url).not.toBeNull()
      return pathToScreen(m![1], '/')
    })
    expect(screens).toEqual(['input', 'tarot', 'log'])
  })
})
