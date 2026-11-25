// 스토어 세로형 스크린샷 6장(라이트). npm run store:screens로 docs/store/screenshots/에 저장
// 애니메이션, 카운트업, 3D 첫 렌더가 끝난 뒤 캡처. 효과음은 끈 상태
// 390x643 뷰포트를 2배율(780x1286)로 찍고 Chromium으로 636x1048에 맞춰 축소
import { writeFileSync } from 'node:fs'
import { expect, test, type Browser, type Page } from '@playwright/test'
import { readList, scanText } from '../../scripts/scan-banned.ts'
import { assertPngSize } from '../../scripts/pngSize.ts'

const OUT = 'docs/store/screenshots'
const SCENE_TIMEOUT = 20_000
// 콘솔 세로형 규격
const STORE_W = 636
const STORE_H = 1048
const DISCLAIMER = '가정 시뮬레이션이며 수익을 보장하지 않습니다. 과거 성과는 미래를 보장하지 않습니다.'
const allow = new Set(readList('allow-tokens.txt'))
const banned = readList('banned-terms.txt')

// 로컬 날짜 YYYY-MM-DD. daysAgo일 전
function localDate(daysAgo: number): string {
  const d = new Date()
  d.setDate(d.getDate() - daysAgo)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

// 기록 화면 예시 데이터. 품목 id는 items.json에 있는 것만
const SAMPLE_RECORDS = [
  { date: localDate(0), itemId: 'chicken', amount: 20000, choice: 'saved' },
  { date: localDate(1), itemId: 'tteokbokki', amount: 9000, choice: 'saved' },
  { date: localDate(2), itemId: 'malatang', amount: 13000, choice: 'saved' },
  { date: localDate(3), itemId: 'icecream', amount: 4500, choice: 'spent' },
  { date: localDate(4), itemId: 'beer', amount: 8000, choice: 'saved' },
  { date: localDate(6), itemId: 'sandwich', amount: 6500, choice: 'saved' },
]

// 효과음 끄기(설정 저장값). records가 있으면 기록도 넣는다
async function prepare(page: Page, records?: unknown[]) {
  await page.addInitScript((recs) => {
    localStorage.setItem('chameum.settings.v1', JSON.stringify({ sound: false }))
    if (recs) localStorage.setItem('chameum.records.v1', JSON.stringify(recs))
  }, records ?? null)
}

// 카운트업 종료: 결과 금액 텍스트가 600ms 동안 그대로일 때
async function waitCountUp(page: Page) {
  const value = page.getByTestId('result-value')
  if ((await value.count()) === 0) return
  let prev = ''
  let stableSince = Date.now()
  for (const start = Date.now(); Date.now() - start < 10_000; ) {
    const now = (await value.textContent()) ?? ''
    if (now !== prev) {
      prev = now
      stableSince = Date.now()
    } else if (Date.now() - stableSince >= 600) return
    await page.waitForTimeout(100)
  }
}

// 3D 첫 렌더: 캔버스 표시, 로딩 표시 사라짐, 몇 프레임 뒤 보간이 멈출 때까지 대기
async function waitScene(page: Page, testId: string) {
  await expect(page.getByTestId(testId).locator('canvas')).toBeVisible({ timeout: SCENE_TIMEOUT })
  await expect(page.getByTestId('scene-loading')).toHaveCount(0, { timeout: SCENE_TIMEOUT })
  await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))))
  await page.waitForTimeout(2500)
}

// 화면 문구 금칙어 확인 후 뷰포트 크기로 캡처
// focus: 화면 높이(643)에서 아래로 밀리는 요소. 이 요소 아래 끝이 하단 탭 바 바로 위에 오도록 스크롤
async function capture(page: Page, name: string, focus?: string) {
  // 포커스 외곽선이 찍히지 않게 입력 포커스 해제
  await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur())
  await page.evaluate((sel) => {
    const el = sel ? document.querySelector(sel) : null
    if (!el) return window.scrollTo(0, 0)
    const bar = document.querySelector('.tabbar')?.getBoundingClientRect().height ?? 0
    const bottom = el.getBoundingClientRect().bottom + window.scrollY
    window.scrollTo(0, Math.max(0, bottom - (window.innerHeight - bar - 16)))
  }, focus ?? null)
  await page.evaluate(() => Promise.all(document.getAnimations().map((a) => a.finished.catch(() => undefined))))
  await waitCountUp(page)
  const text = await page.locator('body').innerText()
  expect(scanText(text, name, allow, banned), `${name} 화면 금칙어`).toEqual([])
  const raw = await page.screenshot()
  const out = await resize(page.context().browser()!, raw)
  assertPngSize(out, STORE_W, STORE_H, name)
  writeFileSync(`${OUT}/${name}.png`, out)
}

// 원본 캡처를 배율 1 페이지에 꽉 채워 그린 뒤 다시 캡처(외부 이미지 라이브러리 없이 축소)
async function resize(browser: Browser, png: Buffer): Promise<Buffer> {
  // 설정의 모바일 에뮬레이션을 끄지 않으면 뷰포트 높이가 1px 어긋난다
  const page = await browser.newPage({ viewport: { width: STORE_W, height: STORE_H }, deviceScaleFactor: 1, isMobile: false, hasTouch: false })
  try {
    const src = `data:image/png;base64,${png.toString('base64')}`
    await page.setContent(`<body style="margin:0"><img src="${src}" style="display:block;width:${STORE_W}px;height:${STORE_H}px"></body>`)
    await page.locator('img').evaluate((img: HTMLImageElement) => img.decode())
    return await page.screenshot()
  } finally {
    await page.close()
  }
}

test('입력, 결과, 타로 장면', async ({ page }) => {
  await prepare(page)

  // 1) 입력: 품목 하나와 금액 20,000원
  await page.goto('/')
  await page.getByRole('button', { name: '배고픔' }).click()
  await page.getByRole('button', { name: '치킨' }).click()
  await page.getByLabel('금액').fill('20000')
  await expect(page.getByLabel('금액')).toHaveValue('20,000')
  await capture(page, '01-input')

  // 2) 결과: 예금형 3D 저금통
  await page.getByRole('button', { name: '환산하기' }).click()
  await expect(page.getByTestId('disclaimer')).toHaveText(DISCLAIMER)
  await waitScene(page, 'coin-stage-3d')
  await capture(page, '02-result-piggy', '.stage-card')

  // 3) 결과: ETF 타임머신형 + 저울
  await page.getByRole('tab', { name: 'ETF 타임머신형' }).click()
  await page.getByRole('button', { name: '저울' }).click()
  await expect(page.getByTestId('etf-disclaimer')).toBeVisible()
  await waitScene(page, 'scale-stage-3d')
  await capture(page, '03-result-etf-scale', '.stage-card')

  // 4) 타로: 5장 펼침
  await page.getByRole('button', { name: '타로' }).click()
  const cards = page.getByRole('group', { name: '카드 다섯 장 중 한 장 고르기' }).getByRole('button')
  await expect(cards).toHaveCount(5)
  await waitScene(page, 'tarot-stage-3d')
  await capture(page, '04-tarot-spread')

  // 5) 타로: 고른 결과
  await cards.nth(2).click()
  await expect(page.getByTestId('tarot-name')).toBeVisible()
  await expect(page.getByTestId('disclaimer')).toHaveText(DISCLAIMER)
  await waitScene(page, 'tarot-stage-3d')
  await capture(page, '05-tarot-result', '.tarot-result')
})

test('참은 기록 장면', async ({ page }) => {
  await prepare(page, SAMPLE_RECORDS)
  await page.goto('/')
  await page.getByRole('button', { name: '기록' }).click()
  await expect(page.getByRole('heading', { name: '기록' })).toBeVisible()
  await expect(page.locator('.record-list')).toContainText('치킨')
  await capture(page, '06-log')
})
