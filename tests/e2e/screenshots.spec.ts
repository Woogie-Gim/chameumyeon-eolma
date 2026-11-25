// README 스크린샷(라이트, 다크). SCREENSHOTS=1일 때만 실행
// 3D 색은 장면을 만들 때 한 번 읽으므로 테마마다 새 컨텍스트로 처음부터 연다
import { test } from '@playwright/test'
import { SHOT_VIEWPORT, gotoResult, shot } from './helpers.ts'

test.skip(process.env.SCREENSHOTS !== '1', '스크린샷 생성 때만 실행')

for (const scheme of ['light', 'dark'] as const) {
  test(`화면 스크린샷 (${scheme})`, async ({ browser }) => {
    const context = await browser.newContext({ viewport: SHOT_VIEWPORT, colorScheme: scheme })
    const page = await context.newPage()

    // 입력: 품목과 금액을 채운 상태
    await page.goto('/')
    await page.getByRole('button', { name: '배고픔' }).click()
    await page.getByRole('button', { name: '치킨' }).click()
    await page.getByLabel('금액').fill('18000')
    await shot(page, `input-${scheme}`)

    // 결과: 카운트업과 코인 쌓임이 끝난 뒤
    await gotoResult(page, '치킨', '18000')
    await page.getByTestId('coin-stage-3d').locator('canvas').waitFor()
    await shot(page, `result-${scheme}`, 2500)

    // 타로: 고르기 전 펼침과 고른 뒤
    await page.getByRole('button', { name: '타로' }).click()
    const cards = page.getByRole('group', { name: '카드 다섯 장 중 한 장 고르기' }).getByRole('button')
    await page.getByTestId('tarot-stage-3d').locator('canvas').waitFor()
    await shot(page, `tarot-spread-${scheme}`, 1200)
    await cards.nth(2).click()
    await page.getByTestId('tarot-name').waitFor()
    await shot(page, `tarot-picked-${scheme}`, 1500)

    await context.close()
  })
}
