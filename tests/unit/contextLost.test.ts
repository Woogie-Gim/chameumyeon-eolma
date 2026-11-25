// @vitest-environment happy-dom
// watchContextLost: 컨텍스트 소실 이벤트에 콜백을 한 번만 부른다
import { describe, expect, it, vi } from 'vitest'
import { watchContextLost } from '../../src/scenes/contextLost.ts'

describe('watchContextLost', () => {
  it('webglcontextlost에 한 번만 반응', () => {
    const canvas = document.createElement('canvas')
    const onLost = vi.fn()
    watchContextLost(canvas, onLost)
    canvas.dispatchEvent(new Event('webglcontextlost'))
    canvas.dispatchEvent(new Event('webglcontextlost'))
    expect(onLost).toHaveBeenCalledTimes(1)
  })

  it('다른 이벤트에는 반응하지 않음', () => {
    const canvas = document.createElement('canvas')
    const onLost = vi.fn()
    watchContextLost(canvas, onLost)
    canvas.dispatchEvent(new Event('webglcontextrestored'))
    expect(onLost).not.toHaveBeenCalled()
  })
})
