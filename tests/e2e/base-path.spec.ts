// GitHub Pages 하위 경로 배포(BASE_PATH) 확인: 자산 404 없음, 새로고침, 딥링크, 404.html 대체 페이지
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { expect, test, type Page } from '@playwright/test'
import { SCENE_TIMEOUT } from './helpers.ts'
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
  await expect(page.getByTestId('coin-stage-3d').locator('canvas')).toBeVisible({ timeout: SCENE_TIMEOUT })

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

// 경로 기반 화면 이동(하위 경로 배포). GitHub Pages는 없는 경로에 404.html(=index.html)을 준다
test('하위 경로에서 주요 기능 경로로 바로 열린다', async ({ page }) => {
  const failed = watchFailures(page)
  // 3D 청크 요청이 끝나기 전에 이동하면 요청이 취소돼 실패로 잡히므로 캔버스까지 기다린다
  const tarotReady = async () => {
    await expect(page.getByRole('heading', { level: 1, name: '오늘의 재물운 타로' })).toBeVisible()
    await expect(page.getByTestId('tarot-stage-3d').locator('canvas')).toBeVisible({ timeout: SCENE_TIMEOUT })
  }
  await page.goto('./tarot')
  await tarotReady()
  await page.reload()
  await tarotReady()
  await page.goto('./record')
  await expect(page.getByRole('heading', { level: 1, name: '기록' })).toBeVisible()
  expect(new URL(page.url()).pathname).toBe(`${BASE_PATH}record`)
  // 문서 요청 외 자산은 모두 성공
  expect(failed.filter((f) => !/\/(tarot|record)$/.test(f))).toEqual([])
})

test('하위 경로에서 탭 이동 경로에 base가 붙고 뒤로가기로 복원', async ({ page }) => {
  await page.goto('./')
  await page.getByRole('button', { name: '타로' }).click()
  expect(new URL(page.url()).pathname).toBe(`${BASE_PATH}tarot`)
  await page.getByRole('button', { name: '기록' }).click()
  expect(new URL(page.url()).pathname).toBe(`${BASE_PATH}record`)
  await page.goBack()
  await expect(page.getByRole('heading', { level: 1, name: '오늘의 재물운 타로' })).toBeVisible()
  await page.goBack()
  await expect(page.getByRole('heading', { name: '무엇을 참아 볼까요?' })).toBeVisible()
  expect(new URL(page.url()).pathname).toBe(BASE_PATH)
})

test('하위 경로에서 없는 경로는 홈으로 열고 주소를 base로 바꾼다', async ({ page }) => {
  await page.goto('./no/such/page')
  await expect(page.getByRole('heading', { name: '무엇을 참아 볼까요?' })).toBeVisible()
  expect(new URL(page.url()).pathname).toBe(BASE_PATH)
})
