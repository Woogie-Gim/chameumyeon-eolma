// 재물운 타로: 탭 이동, 하루 한 장, 새로고침 유지, 날짜 변경, 폴백, 키보드 조작
import { expect, test, type Page } from '@playwright/test'
import { SHOT_VIEWPORT, shot } from './helpers.ts'

test.use({ viewport: SHOT_VIEWPORT })

const NOTICE = /재미로만 보는 오락 콘텐츠/

async function openTarot(page: Page) {
  await page.getByRole('button', { name: '타로' }).click()
  await expect(page.getByRole('heading', { name: '오늘의 재물운 타로' })).toBeVisible()
}

test('뽑기 후 새로고침해도 같은 카드, 다시 뽑기 없음', async ({ page }) => {
  await page.goto('/')
  await openTarot(page)
  await expect(page.getByTestId('tarot-notice')).toHaveText(NOTICE)
  await expect(page.getByRole('img', { name: '뒤집히지 않은 카드 뒷면' })).toBeVisible()
  await expect(page.getByTestId('tarot-name')).toHaveCount(0)

  // 키보드로 뒤집기
  const button = page.getByRole('button', { name: '카드 뒤집기' })
  await button.focus()
  await page.keyboard.press('Enter')
  const name = page.getByTestId('tarot-name')
  await expect(name).toBeVisible()
  await expect(name).toBeFocused()
  const cardName = (await name.innerText()).trim()
  await expect(page.getByRole('img', { name: new RegExp(`^오늘의 카드: ${cardName}, 키워드 .+`) })).toBeVisible()
  await expect(page.locator('.tarot-advice')).not.toContainText('{')
  await expect(button).toHaveCount(0)
  await expect(page.getByRole('button', { name: /다시/ })).toHaveCount(0)
  await shot(page, 'tarot', 1500)

  // 저장값은 날짜와 카드 id만
  const raw = await page.evaluate(() => localStorage.getItem('chameum.tarot.v1'))
  expect(Object.keys(JSON.parse(raw ?? '{}')).sort()).toEqual(['cardId', 'date'])

  // 새로고침 후에도 같은 카드, 뒤집기 버튼 없음
  await page.reload()
  await openTarot(page)
  await expect(page.getByTestId('tarot-name')).toHaveText(cardName)
  await expect(page.getByRole('button', { name: '카드 뒤집기' })).toHaveCount(0)
})

test('어제 뽑은 기록이면 오늘 다시 뒤집을 수 있다', async ({ page }) => {
  await page.addInitScript(() => {
    const d = new Date()
    d.setDate(d.getDate() - 1)
    const p = (n: number) => String(n).padStart(2, '0')
    const key = `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
    localStorage.setItem('chameum.tarot.v1', JSON.stringify({ date: key, cardId: 0 }))
  })
  await page.goto('/')
  await openTarot(page)
  await expect(page.getByRole('button', { name: '카드 뒤집기' })).toBeVisible()
  await expect(page.getByTestId('tarot-name')).toHaveCount(0)
})

test('WebGL 미지원이면 CSS 뒤집기 폴백', async ({ page }) => {
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
  await expect(stage.locator('.tarot-inner')).not.toHaveClass(/is-drawn/)
  await page.getByRole('button', { name: '카드 뒤집기' }).click()
  await expect(stage.locator('.tarot-inner')).toHaveClass(/is-drawn/)
  await expect(page.getByTestId('tarot-name')).toBeVisible()
})

test('일반 환경은 3D 카드, 동작 줄이기면 2D', async ({ page }) => {
  await page.goto('/')
  await openTarot(page)
  await expect(page.getByTestId('tarot-stage-3d').locator('canvas')).toBeVisible()

  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.reload()
  await openTarot(page)
  await expect(page.getByTestId('tarot-stage-2d')).toBeVisible()
})
