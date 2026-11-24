// fallback.ts 단위 테스트
import { describe, expect, it } from 'vitest'
import { detectWebgl, prefersReducedMotion, shouldUse3d } from '../../src/core/fallback.ts'

describe('shouldUse3d', () => {
  it('모든 조건 충족 시에만 3D', () => {
    expect(shouldUse3d({ webgl: true, reduce3d: false, reducedMotion: false })).toBe(true)
  })

  it('하나라도 해당하면 2D', () => {
    expect(shouldUse3d({ webgl: false, reduce3d: false, reducedMotion: false })).toBe(false)
    expect(shouldUse3d({ webgl: true, reduce3d: true, reducedMotion: false })).toBe(false)
    expect(shouldUse3d({ webgl: true, reduce3d: false, reducedMotion: true })).toBe(false)
  })
})

describe('detectWebgl', () => {
  const canvasWith = (ctx: (kind: string) => unknown) => () => ({ getContext: ctx }) as unknown as HTMLCanvasElement

  it('webgl2 또는 webgl 컨텍스트가 있으면 true', () => {
    expect(detectWebgl(canvasWith((k) => (k === 'webgl2' ? {} : null)))).toBe(true)
    expect(detectWebgl(canvasWith((k) => (k === 'webgl' ? {} : null)))).toBe(true)
  })

  it('컨텍스트가 없으면 false', () => {
    expect(detectWebgl(canvasWith(() => null))).toBe(false)
  })

  it('예외는 false', () => {
    expect(detectWebgl(canvasWith(() => { throw new Error('x') }))).toBe(false)
    expect(detectWebgl(() => { throw new Error('no document') })).toBe(false)
  })
})

describe('prefersReducedMotion', () => {
  it('미디어 쿼리 결과', () => {
    expect(prefersReducedMotion(() => ({ matches: true }))).toBe(true)
    expect(prefersReducedMotion(() => ({ matches: false }))).toBe(false)
  })

  it('지원하지 않으면 false', () => {
    expect(prefersReducedMotion(undefined)).toBe(false)
    expect(prefersReducedMotion(() => { throw new Error('x') })).toBe(false)
  })
})

describe('shouldUse3d 전체 조합(저금통, 저울, 타로 공용)', () => {
  it('8가지 조합 중 3D는 하나뿐', () => {
    const combos = [true, false].flatMap((webgl) =>
      [true, false].flatMap((reduce3d) => [true, false].map((reducedMotion) => ({ webgl, reduce3d, reducedMotion }))),
    )
    const on = combos.filter((c) => shouldUse3d(c))
    expect(on).toEqual([{ webgl: true, reduce3d: false, reducedMotion: false }])
  })
})
