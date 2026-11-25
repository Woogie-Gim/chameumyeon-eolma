// 3D 모듈 로딩: 첫 화면에서는 three 청크를 받지 않고, 받는 동안에는 2D 대체 화면이 먼저 보인다
import { expect, test, type Page } from '@playwright/test'
import { SHOT_VIEWPORT, gotoResult } from './helpers.ts'

test.use({ viewport: SHOT_VIEWPORT })

// 지정한 청크 응답을 release 호출 전까지 붙잡는다
async function holdChunk(page: Page, name: string) {
  let release = () => {}
  const gate = new Promise<void>((r) => (release = r))
  await page.route(new RegExp(`/assets/${name}-[^/]*[.]js$`), async (route) => {
    await gate
    await route.continue()
  })
  return () => release()
}

test('첫 화면에서는 three 청크를 받지 않는다', async ({ page }) => {
  const requested: string[] = []
  page.on('request', (r) => requested.push(r.url()))
  await page.goto('/')
  await expect(page.getByLabel('품목 직접 입력')).toBeVisible()
  await page.waitForLoadState('networkidle')
  expect(requested.filter((u) => /\/assets\/three-/.test(u))).toEqual([])

  // 결과 화면의 3D 영역에서 처음 받는다
  await page.getByLabel('품목 직접 입력').fill('커피')
  await page.getByRole('button', { name: '확인' }).click()
  await page.getByLabel('금액').fill('10000')
  await page.getByRole('button', { name: '환산하기' }).click()
  await expect(page.getByTestId('coin-stage-3d').locator('canvas')).toBeVisible()
  expect(requested.some((u) => /\/assets\/three-/.test(u))).toBe(true)
})

test('저금통: 로딩 중 2D 코인과 준비 중 표시, 이후 3D', async ({ page }) => {
  const release = await holdChunk(page, 'PiggyBank')
  await gotoResult(page)
  const stage = page.getByTestId('coin-stage-3d')
  await expect(stage.getByTestId('scene-loading')).toBeVisible()
  await expect(stage.locator('.coin-fallback')).toBeVisible()
  await expect(stage.locator('canvas')).toHaveCount(0)
  await expect(page.getByRole('img', { name: /^원금 코인 \d+개/ })).toBeVisible()

  release()
  await expect(stage.locator('canvas')).toBeVisible()
  await expect(stage.getByTestId('scene-loading')).toHaveCount(0)
})

test('저울: 로딩 중 2D 막대, 이후 3D', async ({ page }) => {
  await gotoResult(page)
  await expect(page.getByTestId('coin-stage-3d').locator('canvas')).toBeVisible()
  const release = await holdChunk(page, 'Scale')
  await page.getByRole('group', { name: '연출 선택' }).getByRole('button', { name: '저울' }).click()
  const stage = page.getByTestId('scale-stage-3d')
  await expect(stage.getByTestId('scene-loading')).toBeVisible()
  await expect(stage.locator('.scale-bar')).toHaveCount(2)
  await expect(stage.locator('canvas')).toHaveCount(0)

  release()
  await expect(stage.locator('canvas')).toBeVisible()
  await expect(stage.getByTestId('scene-loading')).toHaveCount(0)
})

test('타로: 로딩 중 2D 카드, 이후 3D', async ({ page }) => {
  const release = await holdChunk(page, 'TarotCard')
  await page.goto('/')
  await page.getByRole('button', { name: '타로' }).click()
  const stage = page.getByTestId('tarot-stage-3d')
  await expect(stage.getByTestId('scene-loading')).toBeVisible()
  await expect(stage.locator('.tarot-flip')).toBeVisible()
  await expect(stage.locator('canvas')).toHaveCount(0)
  // 로딩 중에도 뒤집기는 동작한다
  await page.getByRole('button', { name: '카드 뒤집기' }).click()
  await expect(page.getByTestId('tarot-name')).toBeVisible()

  release()
  await expect(stage.locator('canvas')).toBeVisible()
  await expect(stage.getByTestId('scene-loading')).toHaveCount(0)
})
