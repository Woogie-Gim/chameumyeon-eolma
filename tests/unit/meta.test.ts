// index.html 배포 메타와 public 아이콘 점검
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { scanText } from '../../scripts/scan-banned.ts'

const ROOT = resolve(import.meta.dirname, '../..')
const html = readFileSync(resolve(ROOT, 'index.html'), 'utf8')
const meta = (attr: string, key: string) => html.match(new RegExp(`<meta ${attr}="${key}" content="([^"]*)"`))?.[1]
const pngSize = (file: string) => {
  const b = readFileSync(resolve(ROOT, 'public', file))
  return { w: b.readUInt32BE(16), h: b.readUInt32BE(20) }
}

describe('index.html 메타', () => {
  it('제목, 설명, 뷰포트(확대 허용), 테마 색 라이트와 다크', () => {
    expect(html).toContain('<html lang="ko">')
    expect(html).toContain('<title>참으면 얼마?</title>')
    expect(meta('name', 'description')).toContain('가정 시뮬레이션')
    const viewport = meta('name', 'viewport')!
    expect(viewport).toContain('width=device-width')
    expect(viewport).not.toMatch(/user-scalable=no|maximum-scale=1/)
    expect(html).toMatch(/name="theme-color" content="#[0-9a-f]{6}" media="\(prefers-color-scheme: light\)"/)
    expect(html).toMatch(/name="theme-color" content="#[0-9a-f]{6}" media="\(prefers-color-scheme: dark\)"/)
  })

  it('OG 태그와 아이콘', () => {
    for (const k of ['og:type', 'og:locale', 'og:title', 'og:description', 'og:url', 'og:image']) expect(meta('property', k), k).toBeTruthy()
    expect(meta('property', 'og:image')).toBe('%APP_OG_IMAGE%')
    expect(html).toContain('rel="icon" type="image/svg+xml" href="/favicon.svg"')
    expect(html).toContain('rel="apple-touch-icon" href="/apple-touch-icon.png"')
  })

  it('문구에 금칙어와 권유 표현이 없다', () => {
    const texts = [...html.matchAll(/content="([^"]*)"/g)].map((m) => m[1])
    expect(texts.flatMap((t) => scanText(t, 'index.html', new Set(['UTF']), []).filter((v) => v.kind !== '티커 의심'))).toEqual([])
  })
})

describe('public 아이콘', () => {
  it('파비콘은 자체 제작 SVG(외부 참조 없음)', () => {
    const svg = readFileSync(resolve(ROOT, 'public/favicon.svg'), 'utf8')
    expect(svg).toMatch(/^<svg /)
    expect(svg).not.toMatch(/href=|<image|<text/)
  })

  it('OG 이미지 1200x630, 홈 화면 아이콘 180x180', () => {
    expect(pngSize('og.png')).toEqual({ w: 1200, h: 630 })
    expect(pngSize('apple-touch-icon.png')).toEqual({ w: 180, h: 180 })
  })
})
