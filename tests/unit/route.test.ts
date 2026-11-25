// 경로와 화면 매핑. 루트 배포(앱인토스)와 하위 경로 배포(GitHub Pages) 모두
import { describe, expect, it } from 'vitest'
import { pathToScreen, screenToPath } from '../../src/core/route.ts'

describe.each([
  ['루트', '/'],
  ['하위 경로', '/chameumyeon-eolma/'],
])('경로 매핑 (%s)', (_, base) => {
  const root = base.replace(/\/$/, '')

  it('주요 기능 경로를 화면으로', () => {
    expect(pathToScreen(`${root}/`, base)).toBe('input')
    expect(pathToScreen(`${root}/tarot`, base)).toBe('tarot')
    expect(pathToScreen(`${root}/record`, base)).toBe('log')
    expect(pathToScreen(`${root}/settings`, base)).toBe('settings')
    expect(pathToScreen(`${root}/info`, base)).toBe('guide')
  })

  it('끝 슬래시와 index.html은 같은 경로', () => {
    expect(pathToScreen(`${root}/tarot/`, base)).toBe('tarot')
    expect(pathToScreen(`${root}/index.html`, base)).toBe('input')
  })

  it('없는 경로와 결과 경로는 null', () => {
    expect(pathToScreen(`${root}/result`, base)).toBeNull()
    expect(pathToScreen(`${root}/some/deep/link`, base)).toBeNull()
    expect(pathToScreen(`${root}/TAROT`, base)).toBeNull()
  })

  it('화면을 base가 붙은 경로로', () => {
    expect(screenToPath('input', base)).toBe(`${root}/`)
    expect(screenToPath('tarot', base)).toBe(`${root}/tarot`)
    expect(screenToPath('log', base)).toBe(`${root}/record`)
    expect(screenToPath('guide', base)).toBe(`${root}/info`)
  })
})

it('하위 경로 배포에서 base 밖 경로는 null', () => {
  expect(pathToScreen('/tarot', '/chameumyeon-eolma/')).toBeNull()
  expect(pathToScreen('/chameumyeon-eolmax/tarot', '/chameumyeon-eolma/')).toBeNull()
  expect(pathToScreen('/chameumyeon-eolma', '/chameumyeon-eolma/')).toBe('input')
})
