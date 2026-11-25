// 스토어 로고 생성. 도형만으로 SVG를 만들고 Playwright Chromium으로 PNG 캡처
// 실행: npm run store:logo (결과는 docs/store/에 저장, 커밋 대상)
// 모티프: 모래시계 + 아래 칸 동전 하나. 글자와 기호 없음
import { chromium } from '@playwright/test'
import { mkdirSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const ROOT = resolve(import.meta.dirname, '..')
const OUT = resolve(ROOT, 'docs/store')
const SIZE = 600
// 원형 마스크 안전 반경. 모든 도형을 중심에서 이 거리 안에 둔다(지름의 70%)
const SAFE_R = 210

// tokens.css에서 색 읽기. 다크 블록은 라이트 값을 덮어쓴다
const css = readFileSync(resolve(ROOT, 'src/styles/tokens.css'), 'utf8')
const [lightPart, darkPart] = css.split('@media (prefers-color-scheme: dark)')
const parse = (s: string) => Object.fromEntries([...s.matchAll(/--color-([\w-]+):\s*(#[0-9a-fA-F]{6})/g)].map((m) => [m[1], m[2]]))
const light = parse(lightPart)
const dark = { ...light, ...parse(darkPart) }

type Palette = { bg: string; glass: string; coin: string; coinRing: string; sand: string }

// 라이트: 메인 틸 바탕에 밝은 모래시계와 금색 동전. 다크: 깊은 남색 바탕에 밝은 틸 모래시계
export const PALETTES: Record<'light' | 'dark', Palette> = {
  light: { bg: light.primary, glass: light.bg, coin: light['coin-grown'], coinRing: light['coin-shine'], sand: light['coin-grown'] },
  dark: { bg: dark.bg, glass: dark.primary, coin: dark['coin-grown'], coinRing: dark['coin-shine'], sand: dark['coin-grown'] },
}

// 모래시계 한쪽 옆선. sx=-1 왼쪽, 1 오른쪽
const side = (sx: number) => {
  const x = (d: number) => 300 + sx * d
  return `M ${x(108)} 168 C ${x(108)} 236, ${x(26)} 262, ${x(26)} 300 C ${x(26)} 338, ${x(108)} 364, ${x(108)} 432`
}

export function logoSvg(p: Palette): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${SIZE}" height="${SIZE}" viewBox="0 0 ${SIZE} ${SIZE}">
  <rect width="${SIZE}" height="${SIZE}" fill="${p.bg}"/>
  <!-- 위 칸에 남은 모래 -->
  <path d="M 246 246 Q 300 236 354 246 L 312 286 Q 300 294 288 286 Z" fill="${p.sand}"/>
  <!-- 떨어지는 모래 줄기 -->
  <rect x="295" y="294" width="10" height="30" rx="5" fill="${p.sand}"/>
  <!-- 아래 칸 동전 -->
  <circle cx="300" cy="388" r="42" fill="${p.coin}"/>
  <circle cx="300" cy="388" r="28" fill="none" stroke="${p.coinRing}" stroke-opacity="0.75" stroke-width="6"/>
  <!-- 모래시계 유리와 받침 -->
  <path d="${side(-1)} ${side(1)}" fill="none" stroke="${p.glass}" stroke-width="28" stroke-linecap="round"/>
  <rect x="170" y="140" width="260" height="32" rx="16" fill="${p.glass}"/>
  <rect x="170" y="428" width="260" height="32" rx="16" fill="${p.glass}"/>
</svg>`
}

// 안전 영역 점검용 극단점(받침 모서리)
const EXTREMES: [number, number][] = [[170, 140], [430, 140], [170, 460], [430, 460]]

function luminance(hex: string): number {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4))
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}
function contrast(a: string, b: string): number {
  const [x, y] = [luminance(a), luminance(b)].sort((p, q) => q - p)
  return (x + 0.05) / (y + 0.05)
}

// 그래픽 요소 대비 3:1 이상, 안전 영역 안쪽 여부 점검
function check(): boolean {
  let ok = true
  for (const [name, p] of Object.entries(PALETTES)) {
    for (const key of ['glass', 'coin'] as const) {
      const c = contrast(p[key], p.bg)
      const pass = c >= 3
      ok &&= pass
      console.log(`${name} ${key} 대비 ${c.toFixed(2)}:1 ${pass ? '통과' : '미달'}`)
    }
  }
  // 둥근 모서리(rx 16)만큼 안쪽으로 들어온 거리로 판단
  const far = Math.max(...EXTREMES.map(([x, y]) => Math.hypot(x - 300, y - 300) - 16 * (Math.SQRT2 - 1)))
  const inSafe = far <= SAFE_R
  ok &&= inSafe
  console.log(`가장 먼 도형 거리 ${far.toFixed(1)}px / 안전 반경 ${SAFE_R}px ${inSafe ? '통과' : '초과'}`)
  return ok
}

async function main() {
  if (!check()) {
    process.exitCode = 1
    return
  }
  mkdirSync(OUT, { recursive: true })
  const browser = await chromium.launch()
  try {
    const page = await browser.newPage({ viewport: { width: SIZE, height: SIZE } })
    for (const name of ['light', 'dark'] as const) {
      await page.setContent(`<body style="margin:0">${logoSvg(PALETTES[name])}</body>`)
      await page.screenshot({ path: resolve(OUT, `logo-${name}.png`) })
    }

    // 확인용 시트: 원형 마스크 160px, 실제 48px(배율 1)
    const img = (name: 'light' | 'dark', px: number, round: boolean) =>
      `<div style="width:${px}px;height:${px}px;${round ? 'border-radius:50%;' : 'border-radius:22%;'}overflow:hidden">${logoSvg(PALETTES[name]).replace(`width="${SIZE}" height="${SIZE}"`, `width="${px}" height="${px}"`)}</div>`
    const row = (bg: string, name: 'light' | 'dark') =>
      `<div style="display:flex;gap:24px;align-items:center;padding:20px;background:${bg}">${img(name, 160, true)}${img(name, 160, false)}${img(name, 48, true)}${img(name, 48, false)}</div>`
    const sheet = await browser.newPage({ viewport: { width: 520, height: 400 }, deviceScaleFactor: 1 })
    await sheet.setContent(`<body style="margin:0">${row('#ffffff', 'light')}${row('#000000', 'dark')}</body>`)
    await sheet.screenshot({ path: resolve(OUT, 'logo-preview.png'), fullPage: true })
  } finally {
    await browser.close()
  }
}

main()
