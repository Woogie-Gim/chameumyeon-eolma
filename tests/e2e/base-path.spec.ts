// GitHub Pages 하위 경로 배포(BASE_PATH) 확인: 자산 404 없음, 새로고침, 딥링크, 404.html 대체 페이지
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { expect, test, type Page } from '@playwright/test'
import { BASE_PATH } from '../../playwright.config.ts'

const ROOT = resolve(import.meta.dirname, '../..')

function watchFailures(page: Page): string[] {
  const failed: string[] = []
  page.on('response', (r) => {
    if (r.status() >= 400) failed.push(`${r.status()} ${r.url()}`)
  })
  page.on('requestfailed', (r) => failed.push(`failed ${r.url()}`))
  return failed
}

test('하위 경로에서 첫 화면, 3D 청크, 아이콘이 404 없이 열린다', async ({ page, request }) => {
  const failed = watchFailures(page)
  await page.goto('./')
  await expect(page.getByRole('heading', { name: '무엇을 참아 볼까요?' })).toBeVisible()

  // 결과 화면까지 가서 3D 청크(three 포함)도 하위 경로에서 받는지
  await page.getByLabel('품목 직접 입력').fill('커피')
  await page.getByRole('button', { name: '확인' }).click()
  await page.getByLabel('금액').fill('10000')
  await page.getByRole('button', { name: '환산하기' }).click()
  await expect(page.getByTestId('coin-stage-3d').locator('canvas')).toBeVisible()

  // head의 아이콘과 OG 이미지 경로
  const hrefs = await page.evaluate(() => [
    ...[...document.querySelectorAll('link[rel~="icon"], link[rel="apple-touch-icon"]')].map((l) => (l as HTMLLinkElement).href),
    (document.querySelector('meta[property="og:image"]') as HTMLMetaElement).content,
  ])
  for (const h of hrefs) {
    const url = new URL(h, page.url())
    expect(url.pathname.startsWith(BASE_PATH), h).toBe(true)
    expect((await request.get(url.pathname)).status(), h).toBe(200)
  }
  expect(failed).toEqual([])
})

test('새로고침과 딥링크에서도 앱이 열린다', async ({ page }) => {
  const failed = watchFailures(page)
  await page.goto('./')
  await page.reload()
  await expect(page.getByRole('heading', { name: '무엇을 참아 볼까요?' })).toBeVisible()

  await page.goto('./some/deep/link?from=share')
  await expect(page.getByRole('heading', { name: '무엇을 참아 볼까요?' })).toBeVisible()
  await page.reload()
  await expect(page.getByRole('heading', { name: '무엇을 참아 볼까요?' })).toBeVisible()
  // 딥링크 문서 자체 외의 자산 요청은 모두 성공
  expect(failed.filter((f) => !f.includes('/some/deep/link'))).toEqual([])
})

test('GitHub Pages용 404.html은 index.html과 같다', () => {
  const index = readFileSync(resolve(ROOT, 'dist-base/index.html'), 'utf8')
  expect(readFileSync(resolve(ROOT, 'dist-base/404.html'), 'utf8')).toBe(index)
  expect(index).toContain(`src="${BASE_PATH}assets/`)
})
