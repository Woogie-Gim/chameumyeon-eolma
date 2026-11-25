// sceneColors.ts 단위 테스트. 3D 색은 tokens.css 변수에서 읽고 없으면 기본값
import { afterEach, describe, expect, it, vi } from 'vitest'
import { readSceneColors } from '../../src/scenes/sceneColors.ts'

afterEach(() => {
  vi.unstubAllGlobals()
})

function stubCss(vars: Record<string, string>) {
  vi.stubGlobal('document', { documentElement: {} })
  vi.stubGlobal('getComputedStyle', () => ({ getPropertyValue: (name: string) => vars[name] ?? '' }))
}

describe('readSceneColors', () => {
  it('DOM이 없으면 기본값', () => {
    const c = readSceneColors()
    expect(c.coinGrown).toMatch(/^#[0-9a-f]{6}$/)
    expect(c.scaleFrame).toMatch(/^#[0-9a-f]{6}$/)
    expect(c.tarotBack).toMatch(/^#[0-9a-f]{6}$/)
  })

  it('tokens.css 변수 값을 공백 없이 읽는다', () => {
    stubCss({ '--color-coin-grown': '  #123456 ', '--color-scale-pan': '#abcdef', '--color-tarot-ink': '#010203' })
    const c = readSceneColors()
    expect(c.coinGrown).toBe('#123456')
    expect(c.scalePan).toBe('#abcdef')
    expect(c.tarotInk).toBe('#010203')
  })

  it('비어 있는 변수는 기본값', () => {
    const defaults = readSceneColors()
    stubCss({})
    expect(readSceneColors()).toEqual(defaults)
  })

  it('호출마다 같은 입력이면 같은 결과', () => {
    stubCss({ '--color-piggy': '#ffeedd' })
    expect(readSceneColors()).toEqual(readSceneColors())
  })
})
