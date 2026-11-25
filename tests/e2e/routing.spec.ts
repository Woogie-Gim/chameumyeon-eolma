// 경로 기반 화면 이동(루트 배포): 주요 기능 경로 직접 진입, 탭 이동 후 뒤로가기, 결과에서 뒤로가기, 없는 경로
import { expect, test, type Page } from '@playwright/test'
import { gotoResult } from './helpers.ts'

const heading = (page: Page, name: string) => page.getByRole('heading', { level: 1, name })
const HOME = '무엇을 참아 볼까요?'

test('주요 기능 경로로 바로 열고 새로고침해도 같은 화면', async ({ page }) => {
  await page.goto('/tarot')
  await expect(heading(page, '오늘의 재물운 타로')).toBeVisible()
  await expect(page.getByRole('button', { name: '타로' })).toHaveAttribute('aria-current', 'page')
  await page.reload()
  await expect(heading(page, '오늘의 재물운 타로')).toBeVisible()

  await page.goto('/record')
  await expect(heading(page, '기록')).toBeVisible()
  await expect(page.getByRole('button', { name: '기록' })).toHaveAttribute('aria-current', 'page')
  await page.reload()
  await expect(heading(page, '기록')).toBeVisible()

  await page.goto('/info')
  await expect(heading(page, '이용 안내')).toBeVisible()
  // 딥링크로 들어온 안내에서 돌아가기는 앱 밖으로 나가지 않고 설정으로
  await page.getByRole('button', { name: '돌아가기' }).click()
  await expect(heading(page, '설정')).toBeVisible()
  await expect(page).toHaveURL(/\/settings$/)
})

test('탭 이동은 경로를 바꾸고 뒤로가기와 앞으로가기로 화면을 복원', async ({ page }) => {
  await page.goto('/')
  await expect(heading(page, HOME)).toBeVisible()

  await page.getByRole('button', { name: '타로' }).click()
  await expect(page).toHaveURL(/\/tarot$/)
  await page.getByRole('button', { name: '기록' }).click()
  await expect(page).toHaveURL(/\/record$/)
  await page.getByRole('button', { name: '설정' }).click()
  await expect(page).toHaveURL(/\/settings$/)
  // 같은 탭을 다시 눌러도 기록이 쌓이지 않는다
  await page.getByRole('button', { name: '설정' }).click()

  await page.goBack()
  await expect(heading(page, '기록')).toBeVisible()
  await expect(page).toHaveURL(/\/record$/)
  await page.goBack()
  await expect(heading(page, '오늘의 재물운 타로')).toBeVisible()
  await page.goBack()
  await expect(heading(page, HOME)).toBeVisible()
  await expect(page).toHaveURL(/\/$/)
  await page.goForward()
  await expect(heading(page, '오늘의 재물운 타로')).toBeVisible()
})

test('결과 화면에서 뒤로가기는 입력값이 남은 입력 화면', async ({ page }) => {
  await gotoResult(page, '치킨', '18000')
  await expect(page.getByRole('heading', { name: /치킨 18,000원/ })).toBeVisible()
  // 결과는 경로를 따로 두지 않는다
  await expect(page).toHaveURL(/\/$/)

  await page.goBack()
  await expect(heading(page, HOME)).toBeVisible()
  await expect(page.getByLabel('금액')).toHaveValue('18,000')

  // 다시 앞으로 가면 결과, 화면의 다시 입력 버튼도 입력으로
  await page.goForward()
  await expect(page.getByRole('heading', { name: /치킨 18,000원/ })).toBeVisible()
  await page.getByRole('button', { name: '다시 입력' }).click()
  await expect(heading(page, HOME)).toBeVisible()
})

test('결과 화면에서 새로고침하면 입력값이 없으므로 입력 화면', async ({ page }) => {
  await gotoResult(page)
  await expect(page.getByTestId('result-value')).toBeVisible()
  await page.reload()
  await expect(heading(page, HOME)).toBeVisible()
})

test('없는 경로와 결과 경로는 홈으로 열고 주소도 홈으로 바꾼다', async ({ page }) => {
  for (const path of ['/result', '/no/such/page', '/tarot/extra']) {
    await page.goto(path)
    await expect(heading(page, HOME), path).toBeVisible()
    await expect(page).toHaveURL(/localhost:\d+\/$/)
  }
})
