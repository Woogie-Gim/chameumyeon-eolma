// tokens.css 색 대비 점검. 텍스트와 포커스 외곽선 모두 4.5:1 이상(라이트, 다크)
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const css = readFileSync(resolve(import.meta.dirname, '../../src/styles/tokens.css'), 'utf8')
const [lightPart, darkPart] = css.split('@media (prefers-color-scheme: dark)')
const parse = (s: string) => Object.fromEntries([...s.matchAll(/--color-([\w-]+):\s*(#[0-9a-fA-F]{6})/g)].map((m) => [m[1], m[2]]))
const light = parse(lightPart)
const dark = { ...light, ...parse(darkPart) }

function luminance(hex: string): number {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4))
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}
function contrast(a: string, b: string): number {
  const [x, y] = [luminance(a), luminance(b)].sort((p, q) => q - p)
  return (x + 0.05) / (y + 0.05)
}

// 화면에서 실제로 쓰는 글자색/배경 조합(app.css 기준)
const TEXT_PAIRS: [string, string][] = [
  ['text', 'bg'], ['text', 'surface'], ['text', 'surface-alt'], ['text', 'secondary-soft'], ['text', 'primary-soft'], ['text', 'stage-bg'],
  ['muted', 'bg'], ['muted', 'surface'], ['muted', 'surface-alt'], ['muted', 'stage-bg'],
  ['primary-strong', 'surface'], ['primary-strong', 'bg'], ['primary-strong', 'primary-soft'],
  ['on-primary', 'primary'], ['on-primary', 'primary-pressed'],
  ['danger', 'danger-soft'], ['danger', 'surface'], ['danger', 'surface-alt'],
]
// 포커스 외곽선(outline-offset으로 요소 바깥에 그림)이 놓이는 배경. 텍스트와 같은 4.5:1 기준
const UI_PAIRS: [string, string][] = [['focus', 'bg'], ['focus', 'surface'], ['focus', 'surface-alt'], ['focus', 'stage-bg']]

describe.each([['라이트', light], ['다크', dark]])('%s 테마 대비', (_, theme) => {
  it.each(TEXT_PAIRS)('텍스트 %s / %s 4.5:1 이상', (fg, bg) => {
    expect(contrast(theme[fg], theme[bg])).toBeGreaterThanOrEqual(4.5)
  })

  it.each(UI_PAIRS)('포커스 외곽선 %s / %s 4.5:1 이상', (fg, bg) => {
    expect(contrast(theme[fg], theme[bg])).toBeGreaterThanOrEqual(4.5)
  })
})

describe('대비 계산', () => {
  it('흑백 21:1, 같은 색 1:1', () => {
    expect(contrast('#000000', '#ffffff')).toBeCloseTo(21, 5)
    expect(contrast('#777777', '#777777')).toBe(1)
  })
})
