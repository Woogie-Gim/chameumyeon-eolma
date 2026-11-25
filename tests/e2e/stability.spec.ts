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
