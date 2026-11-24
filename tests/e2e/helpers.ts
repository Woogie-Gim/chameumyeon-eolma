// E2E 공용 도우미
import type { Page } from '@playwright/test'

// SCREENSHOTS=1일 때만 docs/screenshots에 저장
// settleMs: 3D 코인 보간이 끝날 때까지 기다릴 시간
export async function shot(page: Page, name: string, settleMs = 0) {
  if (process.env.SCREENSHOTS !== '1') return
  if (settleMs > 0) await page.waitForTimeout(settleMs)
  await page.screenshot({ path: `docs/screenshots/${name}.png`, fullPage: true })
}

// 품목과 금액을 입력하고 결과 화면까지 이동
export async function gotoResult(page: Page, item = '커피', amount = '10000') {
  await page.goto('/')
  await page.getByLabel('품목 직접 입력').fill(item)
  await page.getByRole('button', { name: '확인' }).click()
  await page.getByLabel('금액').fill(amount)
  await page.getByRole('button', { name: '환산하기' }).click()
}
