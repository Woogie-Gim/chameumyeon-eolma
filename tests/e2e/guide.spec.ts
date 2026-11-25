// 어느 화면에서든 상단 안내 버튼으로 면책 문구와 개인정보 문구를 볼 수 있고, 돌아가기로 원래 화면에 온다
import { expect, test, type Page } from '@playwright/test'
import { SHOT_VIEWPORT, gotoResult } from './helpers.ts'

test.use({ viewport: SHOT_VIEWPORT })

const DISCLAIMER = '가정 시뮬레이션이며 수익을 보장하지 않습니다. 과거 성과는 미래를 보장하지 않습니다.'
const PRIVACY = '입력 내용은 서버로 전송되거나 저장되지 않아요.'

async function checkGuideFrom(page: Page, heading: string | RegExp) {
  await expect(page.getByRole('heading', { level: 1, name: heading })).toBeVisible()
  await page.getByRole('button', { name: '안내', exact: true }).click()
  const notice = page.getByTestId('guide-notice')
  await expect(notice).toBeInViewport()
  await expect(notice).toContainText(DISCLAIMER)
  await expect(notice).toContainText(PRIVACY)
  await expect(notice).toContainText('이 기기에만 남아요')
  await page.getByRole('button', { name: '돌아가기' }).click()
  await expect(page.getByRole('heading', { level: 1, name: heading })).toBeVisible()
}

test('입력, 기록, 타로, 설정 화면에서 안내를 열고 돌아온다', async ({ page }) => {
  await page.goto('/')
  await checkGuideFrom(page, '무엇을 참아 볼까요?')
  await page.getByRole('button', { name: '기록' }).click()
  await checkGuideFrom(page, /기록/)
  await page.getByRole('button', { name: '타로' }).click()
  await checkGuideFrom(page, '오늘의 재물운 타로')
  await page.getByRole('button', { name: '설정' }).click()
  await checkGuideFrom(page, '설정')
})

test('결과 화면에서 안내를 열고 돌아와도 입력값이 유지된다', async ({ page }) => {
  await gotoResult(page, '커피', '4500')
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
  // 상단 헤더는 스크롤해도 보인다
  await expect(page.getByRole('button', { name: '안내', exact: true })).toBeInViewport()
  await checkGuideFrom(page, /커피 4,500원/)
})

test('입력 화면 직접 입력 칸 아래에 개인정보 문구', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByText(PRIVACY)).toBeVisible()
})
