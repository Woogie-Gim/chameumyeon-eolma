// 재물운 타로: 5장 펼침에서 한 장 고르기, 하루 고정, 새로고침 유지, 날짜 변경, 폴백, 키보드 조작
import { expect, test, type Page } from '@playwright/test'
import { SCENE_TIMEOUT, SHOT_VIEWPORT } from './helpers.ts'

test.use({ viewport: SHOT_VIEWPORT })

const NOTICE = /재미로만 보는 오락 콘텐츠/
const TOMORROW = /내일 다시 볼 수 있어요/

async function openTarot(page: Page) {
  await page.getByRole('button', { name: '타로' }).click()
  await expect(page.getByRole('heading', { name: '오늘의 재물운 타로' })).toBeVisible()
}

const spread = (page: Page) => page.getByRole('group', { name: '카드 다섯 장 중 한 장 고르기' })
const cards = (page: Page) => spread(page).getByRole('button')

// 펼친 카드 5장이 모두 뷰포트 안에 있고 각자 44px 이상 눌린다
async function expectSpreadInViewport(page: Page) {
  await expect(cards(page)).toHaveCount(5)
  for (let i = 0; i < 5; i++) {
    const box = await cards(page).nth(i).boundingBox()
    expect(box, `카드 ${i + 1}`).not.toBeNull()
    expect(box!.x).toBeGreaterThanOrEqual(0)
    expect(box!.x + box!.width).toBeLessThanOrEqual(SHOT_VIEWPORT.width)
    expect(box!.y + box!.height).toBeLessThanOrEqual(SHOT_VIEWPORT.height)
  }
  // 겹친 부채꼴에서도 카드 사이 노출 폭이 44px 이상
  const xs = await cards(page).evaluateAll((els) => els.map((e) => e.getBoundingClientRect().left))
  for (let i = 1; i < xs.length; i++) expect(xs[i] - xs[i - 1]).toBeGreaterThanOrEqual(44)
}

test('5장 펼침에서 키보드로 한 장 고르면 뒤집히고 나머지는 흐려진다. 새로고침하면 펼침 없이 같은 카드', async ({ page }) => {
  await page.goto('/')
  await openTarot(page)
  await expect(page.getByTestId('tarot-notice')).toHaveText(NOTICE)
  await expectSpreadInViewport(page)
  await expect(page.getByTestId('tarot-name')).toHaveCount(0)
  await expect(cards(page).first()).toHaveAccessibleName('1번째 카드 뒷면, 눌러서 뒤집기')

  // 탭 순서에는 한 장만(로빙 tabindex). 방향키로 이동
  await expect(spread(page).locator('[tabindex="0"]')).toHaveCount(1)
  await cards(page).nth(2).focus()
  await page.keyboard.press('ArrowRight')
  await expect(cards(page).nth(3)).toBeFocused()
  await page.keyboard.press('ArrowLeft')
  await page.keyboard.press('ArrowLeft')
  await expect(cards(page).nth(1)).toBeFocused()
  await page.keyboard.press('End')
  await expect(cards(page).nth(4)).toBeFocused()
  await page.keyboard.press('ArrowRight') // 끝에서 처음으로
  await expect(cards(page).nth(0)).toBeFocused()
  await page.keyboard.press('ArrowRight')
  await page.keyboard.press('Enter')

  const name = page.getByTestId('tarot-name')
  await expect(name).toBeVisible()
  await expect(name).toBeFocused()
  const cardName = (await name.innerText()).trim()
  await expect(cards(page).nth(1)).toHaveAttribute('data-state', 'picked')
  await expect(cards(page).nth(1)).toHaveAccessibleName(new RegExp(`^고른 카드: ${cardName}, 키워드 .+`))
  for (const i of [0, 2, 3, 4]) {
    await expect(cards(page).nth(i)).toHaveAttribute('data-state', 'dimmed')
    await expect(cards(page).nth(i)).toHaveAttribute('aria-disabled', 'true')
  }
  await expect(page.locator('.tarot-advice')).not.toContainText('{')
  await expect(page.getByTestId('tarot-tomorrow')).toHaveText(TOMORROW)

  // 다른 카드를 눌러도 바뀌지 않는다
  await cards(page).nth(3).click({ force: true })
  await expect(name).toHaveText(cardName)

  // 저장값은 날짜와 카드 id만
  const raw = await page.evaluate(() => localStorage.getItem('chameum.tarot.v1'))
  expect(Object.keys(JSON.parse(raw ?? '{}')).sort()).toEqual(['cardId', 'date'])

  // 새로고침 후에는 펼침 없이 오늘 카드와 내일 안내
  await page.reload()
  await openTarot(page)
  await expect(page.getByTestId('tarot-name')).toHaveText(cardName)
  await expect(spread(page)).toHaveCount(0)
  await expect(page.getByTestId('tarot-tomorrow')).toHaveText(/이미 카드를 골랐어요/)
  await expect(page.getByRole('img', { name: new RegExp(`^오늘의 카드: ${cardName}`) })).toBeVisible()
})

test('어제 고른 기록이면 오늘 다시 펼친다', async ({ page }) => {
  await page.addInitScript(() => {
    const d = new Date()
    d.setDate(d.getDate() - 1)
    const p = (n: number) => String(n).padStart(2, '0')
    const key = `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
    localStorage.setItem('chameum.tarot.v1', JSON.stringify({ date: key, cardId: 0 }))
  })
  await page.goto('/')
  await openTarot(page)
  await expect(cards(page)).toHaveCount(5)
  await expect(page.getByTestId('tarot-name')).toHaveCount(0)
})

test('WebGL 미지원이면 CSS 2D로 같은 선택 흐름', async ({ page }) => {
  await page.addInitScript(() => {
    const orig = HTMLCanvasElement.prototype.getContext
    HTMLCanvasElement.prototype.getContext = function (this: HTMLCanvasElement, kind: string, ...rest: unknown[]) {
      if (kind.startsWith('webgl') || kind === 'experimental-webgl') return null
      return (orig as (...a: unknown[]) => unknown).call(this, kind, ...rest)
    } as typeof orig
  })
  await page.goto('/')
  await openTarot(page)
  const stage = page.getByTestId('tarot-stage-2d')
  await expect(stage).toBeVisible()
  await expect(page.locator('canvas')).toHaveCount(0)
  await expectSpreadInViewport(page)
  await expect(stage.locator('.tarot-inner')).toHaveCount(5)
  await expect(stage.locator('.tarot-inner.is-drawn')).toHaveCount(0)
  await cards(page).nth(4).click()
  await expect(stage.locator('.tarot-inner.is-drawn')).toHaveCount(1)
  await expect(cards(page).nth(4).locator('.tarot-inner')).toHaveClass(/is-drawn/)
  await expect(page.getByTestId('tarot-name')).toBeVisible()
})

test('일반 환경은 3D 펼침(버튼은 캔버스 위 투명 레이어), 동작 줄이기면 2D', async ({ page }) => {
  await page.goto('/')
  await openTarot(page)
  const stage = page.getByTestId('tarot-stage-3d')
  await expect(stage.locator('canvas')).toBeVisible({ timeout: SCENE_TIMEOUT })
  await expect(cards(page)).toHaveCount(5)
  await expect(cards(page).first()).toHaveClass(/is-ghost/)
  await cards(page).nth(2).click()
  await expect(page.getByTestId('tarot-name')).toBeVisible()

  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.evaluate(() => localStorage.removeItem('chameum.tarot.v1'))
  await page.reload()
  await openTarot(page)
  await expect(page.getByTestId('tarot-stage-2d')).toBeVisible()
})

test('자정이 지나 앱이 다시 보이면 새로 펼쳐 다시 고를 수 있다', async ({ page }) => {
  // 3D 렌더 루프와 가짜 시계가 섞이지 않도록 2D 환경
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.clock.install({ time: new Date(2026, 10, 25, 23, 59, 0) })
  await page.goto('/')
  await openTarot(page)
  await cards(page).first().click()
  await expect(page.getByTestId('tarot-name')).toBeVisible()
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('chameum.tarot.v1') ?? '{}'))
  expect(saved.date).toBe('2026-11-25')

  // 다음 날로 넘어간 뒤 앱이 다시 보이면 날짜 갱신
  await page.clock.setSystemTime(new Date(2026, 10, 26, 0, 1, 0))
  await page.evaluate(() => document.dispatchEvent(new Event('visibilitychange')))
  await expect(cards(page)).toHaveCount(5)
  await expect(cards(page).first()).toHaveAccessibleName('1번째 카드 뒷면, 눌러서 뒤집기')
  await expect(page.getByTestId('tarot-name')).toHaveCount(0)
  await cards(page).nth(3).click()
  await expect(page.getByTestId('tarot-name')).toBeVisible()
  const next = await page.evaluate(() => JSON.parse(localStorage.getItem('chameum.tarot.v1') ?? '{}'))
  expect(next.date).toBe('2026-11-26')
})
