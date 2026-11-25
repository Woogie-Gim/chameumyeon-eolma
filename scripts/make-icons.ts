// OG 이미지와 홈 화면 아이콘 생성. 자체 제작 SVG와 HTML 카드를 Playwright Chromium으로 캡처
// 실행: npx tsx scripts/make-icons.ts (결과는 public/에 저장, 커밋 대상)
import { chromium } from '@playwright/test'
import { readFileSync } from 'node:fs'
import { pathToFileURL } from 'node:url'
import { resolve } from 'node:path'

const ROOT = resolve(import.meta.dirname, '..')

async function main() {
  const browser = await chromium.launch()
  try {
    const og = await browser.newPage({ viewport: { width: 1200, height: 630 } })
    await og.goto(pathToFileURL(resolve(ROOT, 'scripts/assets/og-card.html')).href)
    await og.screenshot({ path: resolve(ROOT, 'public/og.png') })

    const icon = await browser.newPage({ viewport: { width: 180, height: 180 } })
    // about:blank에서는 file 이미지를 못 읽으므로 SVG를 인라인으로 넣는다
    const svg = readFileSync(resolve(ROOT, 'public/favicon.svg'), 'utf8').replace('<svg ', '<svg width="150" height="150" ')
    await icon.setContent(`<body style="margin:0;background:#f7f4ee;display:grid;place-items:center;width:180px;height:180px">${svg}</body>`)
    await icon.screenshot({ path: resolve(ROOT, 'public/apple-touch-icon.png') })
  } finally {
    await browser.close()
  }
}

main()
