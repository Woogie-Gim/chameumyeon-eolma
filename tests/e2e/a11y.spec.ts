// 접근성과 모바일: 터치 영역 44px, 키보드 탐색과 포커스 표시, 3D 대체 텍스트, 동작 줄이기
import { expect, test, type Page } from '@playwright/test'
import { gotoResult, SCENE_TIMEOUT, SHOT_VIEWPORT } from './helpers.ts'

test.use({ viewport: SHOT_VIEWPORT, hasTouch: true, isMobile: true })

const MIN = 44

// 보이는 버튼, 탭, 체크박스(감싸는 label 기준)의 크기가 44px 미만인 것 목록
async function smallTargets(page: Page): Promise<string[]> {
  return page.evaluate((min) => {
    const out: string[] = []
    const els = document.querySelectorAll<HTMLElement>('button, [role="tab"], input[type="checkbox"]')
    for (const el of els) {
      const target = el instanceof HTMLInputElement ? (el.closest('label') ?? el) : el
      const r = target.getBoundingClientRect()
      if (r.width === 0 && r.height === 0) continue // 숨김
      if (r.width < min || r.height < min) out.push(`${(el.textContent || el.getAttribute('aria-label') || el.id).trim()} ${Math.round(r.width)}x${Math.round(r.height)}`)
    }
    return out
  }, MIN)
}

test('모든 화면의 버튼과 탭 터치 영역 44px 이상', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: '배고픔' }).click() // 품목 칩 표시
  expect(await smallTargets(page), '입력').toEqual([])

  await gotoResult(page)
  expect(await smallTargets(page), '결과').toEqual([])
  await page.getByRole('button', { name: '다음' }).click()
  expect(await smallTargets(page), '선택').toEqual([])
  await page.getByRole('button', { name: '참았어요' }).click()
  expect(await smallTargets(page), '기록').toEqual([])

  await page.getByRole('button', { name: '타로' }).click()
  expect(await smallTargets(page), '타로').toEqual([])
  await page.getByRole('button', { name: '설정' }).click()
  expect(await smallTargets(page), '설정').toEqual([])
  await page.getByRole('button', { name: '이용 안내' }).click()
  expect(await smallTargets(page), '안내').toEqual([])
})

test('키보드만으로 탭바까지 이동하고 포커스 외곽선이 보인다', async ({ page }) => {
  await page.goto('/')
  let reached = false
  for (let i = 0; i < 40 && !reached; i++) {
    await page.keyboard.press('Tab')
    reached = await page.evaluate(() => document.activeElement?.textContent === '설정' && !!document.activeElement.closest('.tabbar'))
  }
  expect(reached).toBe(true)
  const outline = await page.evaluate(() => {
    const s = getComputedStyle(document.activeElement as Element)
    return { style: s.outlineStyle, width: s.outlineWidth }
  })
  expect(outline).toEqual({ style: 'solid', width: '3px' })

  // Enter로 화면 전환
  await page.keyboard.press('Enter')
  await expect(page.getByRole('heading', { name: '설정' })).toBeVisible()
})

test('3D 영역 세 곳 모두 대체 텍스트가 있다', async ({ page }) => {
  await gotoResult(page)
  await expect(page.getByTestId('coin-stage-3d')).toHaveAttribute('role', 'img')
  await expect(page.getByTestId('coin-stage-3d')).toHaveAttribute('aria-label', /^원금 코인 \d+개, 불어난 코인 \d+개 쌓임$/)
  await page.getByRole('group', { name: '연출 선택' }).getByRole('button', { name: '저울' }).click()
  await expect(page.getByTestId('scale-stage-3d')).toHaveAttribute('aria-label', /환산 금액 약 [\d,]+원\./)
  await page.getByRole('button', { name: '타로' }).click()
  await expect(page.getByTestId('tarot-stage-3d')).toHaveAttribute('aria-label', '뒤집히지 않은 카드 뒷면')
  // 캔버스는 aria-hidden 래퍼 안에 있어 보조 기기에서 숨김
  await expect(page.getByTestId('tarot-stage-3d').locator('canvas')).toBeVisible({ timeout: SCENE_TIMEOUT })
  expect(await page.getByTestId('tarot-stage-3d').locator('canvas').evaluate((c) => c.closest('[aria-hidden="true"]') !== null)).toBe(true)
})

test('동작 줄이기: 저금통, 저울, 타로 모두 2D이고 카드 전환 애니메이션 없음', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await gotoResult(page)
  await expect(page.getByTestId('coin-stage-2d')).toBeVisible()
  await page.getByRole('group', { name: '연출 선택' }).getByRole('button', { name: '저울' }).click()
  await expect(page.getByTestId('scale-stage-2d')).toBeVisible()
  await page.getByRole('button', { name: '타로' }).click()
  await expect(page.getByTestId('tarot-stage-2d')).toBeVisible()
  const duration = await page.locator('.tarot-inner').evaluate((el) => getComputedStyle(el).transitionDuration)
  expect(duration).toBe('0s')
  await expect(page.locator('canvas')).toHaveCount(0)
})
