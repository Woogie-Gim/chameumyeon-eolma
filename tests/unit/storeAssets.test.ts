// 스토어 자산 규격 점검. 커밋된 PNG의 실제 픽셀 크기를 읽어 콘솔 규격과 비교
import { readdirSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { pngSize } from '../../scripts/pngSize.ts'

const STORE = resolve(import.meta.dirname, '../../docs/store')

describe('스토어 자산 규격', () => {
  it('로고는 600x600 두 장', () => {
    for (const name of ['logo-light.png', 'logo-dark.png']) {
      expect(pngSize(resolve(STORE, name))).toEqual({ width: 600, height: 600 })
    }
  })

  it('세로형 스크린샷은 636x1048, 최소 3장', () => {
    const files = readdirSync(resolve(STORE, 'screenshots')).filter((f) => f.endsWith('.png'))
    expect(files.length).toBeGreaterThanOrEqual(3)
    for (const f of files) expect(pngSize(resolve(STORE, 'screenshots', f)), f).toEqual({ width: 636, height: 1048 })
  })

  it('촬영 뷰포트 390x643은 636x1048과 비율이 0.1% 안에서 같다', () => {
    expect(Math.abs(390 / 643 / (636 / 1048) - 1)).toBeLessThan(0.001)
  })
})
