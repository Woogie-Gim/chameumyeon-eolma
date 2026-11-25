// 스토어 가로형 배너(1504x741) 생성. scripts/store-banner.html을 Playwright Chromium으로 캡처
// 실행: npm run store:banner (세로형 스크린샷과 로고를 먼저 만든 뒤 실행)
import { chromium } from '@playwright/test'
import { existsSync } from 'node:fs'
import { pathToFileURL } from 'node:url'
import { resolve } from 'node:path'
import { assertPngSize } from './pngSize.ts'

const ROOT = resolve(import.meta.dirname, '..')
const OUT = resolve(ROOT, 'docs/store/banner.png')
const W = 1504
const H = 741
const INPUTS = ['docs/store/logo-light.png', 'docs/store/screenshots/02-result-piggy.png', 'docs/store/screenshots/04-tarot-spread.png']

async function main() {
  const missing = INPUTS.filter((p) => !existsSync(resolve(ROOT, p)))
  if (missing.length > 0) throw new Error(`필요한 이미지 없음: ${missing.join(', ')}`)

  const browser = await chromium.launch()
  try {
    const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1, colorScheme: 'light' })
    await page.goto(pathToFileURL(resolve(ROOT, 'scripts/store-banner.html')).href)
    // 이미지가 모두 그려진 뒤 캡처
    await page.evaluate(() => Promise.all([...document.images].map((img) => img.decode())))
    await page.screenshot({ path: OUT })
  } finally {
    await browser.close()
  }
  assertPngSize(OUT, W, H, 'banner')
  console.log(`배너 ${W}x${H} 저장: docs/store/banner.png`)
}

main().catch((e) => {
  console.error(e)
  process.exitCode = 1
})
