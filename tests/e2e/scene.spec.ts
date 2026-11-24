// 3D 저금통과 2D 폴백
import { expect, test } from '@playwright/test'
import { SHOT_VIEWPORT, gotoResult, shot } from './helpers.ts'

test.use({ viewport: SHOT_VIEWPORT })

const stageLabel = /^원금 코인 \d+개, 불어난 코인 \d+개 쌓임$/

test('일반 환경에서 3D 캔버스와 대체 텍스트', async ({ page }) => {
  await gotoResult(page)
  const stage = page.getByTestId('coin-stage-3d')
  await expect(stage).toBeVisible()
  await expect(stage.locator('canvas')).toBeVisible()
  await expect(page.getByRole('img', { name: stageLabel })).toBeVisible()

  // 슬라이더 변화에 따라 코인 수 변경
  const before = await stage.getAttribute('aria-label')
  await page.getByLabel('몇 년 뒤').fill('10')
  await expect(stage).not.toHaveAttribute('aria-label', before ?? '')
  await expect(stage).toHaveAttribute('aria-label', stageLabel)
  await shot(page, 'result-3d', 2500)

  // 카메라 조작 요소 없음: 캔버스 외 버튼 없음
  await expect(stage.locator('button')).toHaveCount(0)
})

test('WebGL 미지원이면 2D 폴백', async ({ page }) => {
  await page.addInitScript(() => {
    const orig = HTMLCanvasElement.prototype.getContext
    HTMLCanvasElement.prototype.getContext = function (this: HTMLCanvasElement, kind: string, ...rest: unknown[]) {
      if (kind.startsWith('webgl') || kind === 'experimental-webgl') return null
      return (orig as (...a: unknown[]) => unknown).call(this, kind, ...rest)
    } as typeof orig
  })
  await gotoResult(page)
  await expect(page.getByTestId('coin-stage-2d')).toBeVisible()
  await expect(page.getByTestId('coin-stage-3d')).toHaveCount(0)
  await expect(page.locator('canvas')).toHaveCount(0)
  await expect(page.getByRole('img', { name: stageLabel })).toBeVisible()

  // 원금 코인과 불어난 코인을 다른 클래스로 그림. 대체 텍스트 개수와 일치
  await page.getByLabel('몇 년 뒤').fill('10')
  const label = (await page.getByTestId('coin-stage-2d').getAttribute('aria-label')) ?? ''
  const [, p, g] = label.match(/원금 코인 (\d+)개, 불어난 코인 (\d+)개/) ?? []
  expect(Number(g)).toBeGreaterThan(0)
  await expect(page.locator('.coin-fallback .coin-principal')).toHaveCount(Number(p))
  await expect(page.locator('.coin-fallback .coin-grown')).toHaveCount(Number(g))
})

test('동작 줄이기 설정이면 2D 폴백', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await gotoResult(page)
  await expect(page.getByTestId('coin-stage-2d')).toBeVisible()
})

test('설정의 저사양 3D 끄기 토글이 2D로 전환', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: '설정' }).click()
  await page.getByLabel('저사양 3D 끄기').check()
  await page.getByRole('button', { name: '입력' }).click()
  await page.getByLabel('품목 직접 입력').fill('커피')
  await page.getByRole('button', { name: '확인' }).click()
  await page.getByLabel('금액').fill('10000')
  await page.getByRole('button', { name: '환산하기' }).click()
  await expect(page.getByTestId('coin-stage-2d')).toBeVisible()
  await shot(page, 'result-2d')

  // 토글을 끄면 다시 3D
  await page.getByRole('button', { name: '설정' }).click()
  await page.getByLabel('저사양 3D 끄기').uncheck()
  await page.getByRole('button', { name: '입력' }).click()
  await page.getByRole('button', { name: '환산하기' }).click()
  await expect(page.getByTestId('coin-stage-3d')).toBeVisible()
})

test('ETF형 결과는 과거 시제 한마디', async ({ page }) => {
  await gotoResult(page)
  await page.getByRole('tab', { name: 'ETF 타임머신형' }).click()
  await expect(page.locator('.quote')).not.toContainText('년 뒤')
  await expect(page.locator('.quote')).toContainText('지금')
})

test('ETF형 시작 연도는 마지막 연도 직전까지', async ({ page }) => {
  await gotoResult(page)
  await page.getByRole('tab', { name: '예금형' }).click()
  await page.getByLabel('몇 년 뒤').fill('1')
  await page.getByRole('tab', { name: 'ETF 타임머신형' }).click()
  const slider = page.getByLabel('몇 년 전에 넣었다면')
  await expect(slider).toHaveAttribute('min', '2')
  await expect(slider).toHaveValue('2')
  const line = await page.locator('.rate-line').innerText()
  const m = line.match(/(\d{4})~(\d{4})/)
  expect(m).not.toBeNull()
  expect(Number(m![1])).toBe(Number(m![2]) - 1)
})
