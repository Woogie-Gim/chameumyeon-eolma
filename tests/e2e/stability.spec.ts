// 안정성: 저장소 차단, 용량 초과, WebGL 컨텍스트 소실, 금액 입력 경계
import { expect, test } from '@playwright/test'
import { SHOT_VIEWPORT, gotoResult } from './helpers.ts'

test.use({ viewport: SHOT_VIEWPORT })

test('localStorage 접근이 차단돼도 흐름이 동작하고 안내를 보여 준다', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(e.message))
  await page.addInitScript(() => {
    Object.defineProperty(window, 'localStorage', {
      configurable: true,
      get() {
        throw new DOMException('blocked', 'SecurityError')
      },
    })
  })
  await gotoResult(page, '치킨', '18000')
  await page.getByRole('button', { name: '다음' }).click()
  await page.getByRole('button', { name: '참았어요' }).click()
  await expect(page.getByTestId('streak')).toHaveText('1일')
  await page.getByRole('button', { name: '설정' }).click()
  await expect(page.getByTestId('storage-notice')).toBeVisible()
  expect(errors).toEqual([])
})

test('저장 용량 초과여도 기록이 세션 안에서 유지된다', async ({ page }) => {
  await page.addInitScript(() => {
    Storage.prototype.setItem = function () {
      throw new DOMException('full', 'QuotaExceededError')
    }
  })
  await gotoResult(page, '커피', '4500')
  await page.getByRole('button', { name: '다음' }).click()
  await page.getByRole('button', { name: '참았어요' }).click()
  await expect(page.getByTestId('streak')).toHaveText('1일')
  await page.getByRole('button', { name: '설정' }).click()
  await expect(page.getByTestId('storage-notice')).toBeVisible()
})

test('정상 환경에서는 저장소 안내가 없다', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: '설정' }).click()
  await expect(page.getByTestId('storage-notice')).toHaveCount(0)
})

// 캔버스의 WebGL 컨텍스트를 강제로 잃게 한다
async function loseContext(page: import('@playwright/test').Page, testId: string) {
  await page.getByTestId(testId).locator('canvas').evaluate((c: HTMLCanvasElement) => {
    const gl = (c.getContext('webgl2') ?? c.getContext('webgl')) as WebGLRenderingContext | null
    gl?.getExtension('WEBGL_lose_context')?.loseContext()
  })
}

test('WebGL 컨텍스트가 소실되면 저금통이 2D로 바뀐다', async ({ page }) => {
  await gotoResult(page)
  await expect(page.getByTestId('coin-stage-3d').locator('canvas')).toBeVisible()
  await loseContext(page, 'coin-stage-3d')
  await expect(page.getByTestId('coin-stage-2d')).toBeVisible()
  await expect(page.locator('canvas')).toHaveCount(0)
  await expect(page.getByRole('img', { name: /^원금 코인 \d+개/ })).toBeVisible()
})

test('WebGL 컨텍스트가 소실되면 저울이 2D로 바뀐다', async ({ page }) => {
  await gotoResult(page)
  await page.getByRole('group', { name: '연출 선택' }).getByRole('button', { name: '저울' }).click()
  await expect(page.getByTestId('scale-stage-3d').locator('canvas')).toBeVisible()
  await loseContext(page, 'scale-stage-3d')
  await expect(page.getByTestId('scale-stage-2d')).toBeVisible()
  await expect(page.getByTestId('scale-stage-2d').locator('.scale-bar')).toHaveCount(2)
})

test('WebGL 컨텍스트가 소실되면 타로 카드가 2D로 바뀐다', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: '타로' }).click()
  await expect(page.getByTestId('tarot-stage-3d').locator('canvas')).toBeVisible()
  await loseContext(page, 'tarot-stage-3d')
  await expect(page.getByTestId('tarot-stage-2d')).toBeVisible()
  await page.getByRole('button', { name: '카드 뒤집기' }).click()
  await expect(page.getByTestId('tarot-name')).toBeVisible()
})
