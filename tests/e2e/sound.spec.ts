// 효과음: 첫 입력 전에는 AudioContext 없음, 설정 토글 저장, 오디오 실패에도 오류 없음
import { expect, test, type Page } from '@playwright/test'
import { gotoResult } from './helpers.ts'

// AudioContext 생성 횟수를 센다
async function countContexts(page: Page) {
  await page.addInitScript(() => {
    const w = window as unknown as { __ctx: number; AudioContext: typeof AudioContext }
    w.__ctx = 0
    const Orig = w.AudioContext
    w.AudioContext = class extends Orig {
      constructor(...args: ConstructorParameters<typeof AudioContext>) {
        super(...args)
        w.__ctx++
      }
    }
  })
}
const contexts = (page: Page) => page.evaluate(() => (window as unknown as { __ctx: number }).__ctx)

test('첫 입력 전에는 오디오를 만들지 않고, 버튼을 누르면 한 번만 만든다', async ({ page }) => {
  await countContexts(page)
  await page.goto('/')
  await expect(page.getByRole('heading', { name: '무엇을 참아 볼까요?' })).toBeVisible()
  expect(await contexts(page)).toBe(0)
  await page.getByRole('button', { name: '배고픔' }).click()
  await page.getByRole('button', { name: '치킨' }).click()
  expect(await contexts(page)).toBe(1)
})

test('설정에서 효과음을 끄면 저장되고 소리를 만들지 않는다', async ({ page }) => {
  await countContexts(page)
  await page.goto('/')
  await page.getByRole('button', { name: '설정' }).click()
  const toggle = page.getByLabel('효과음')
  await expect(toggle).toBeChecked()
  await toggle.uncheck()
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('chameum.settings.v1') ?? '{}'))
  expect(saved.sound).toBe(false)

  await page.reload()
  await page.getByRole('button', { name: '설정' }).click()
  await expect(page.getByLabel('효과음')).not.toBeChecked()
  await page.getByRole('button', { name: '입력' }).click()
  await page.getByRole('button', { name: '배고픔' }).click()
  expect(await contexts(page)).toBe(0)
})

test('오디오와 진동이 막힌 환경에서도 오류 없이 흐름이 동작한다', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(e.message))
  await page.addInitScript(() => {
    const w = window as unknown as Record<string, unknown>
    w.AudioContext = class {
      constructor() {
        throw new Error('NotAllowedError')
      }
    }
    Object.defineProperty(navigator, 'vibrate', {
      value: () => {
        throw new Error('blocked')
      },
    })
  })
  await gotoResult(page)
  await expect(page.getByTestId('result-value')).toContainText('원')
  await page.getByRole('button', { name: '다음' }).click()
  await page.getByRole('button', { name: /참았어요/ }).click()
  await expect(page.getByRole('heading', { name: /기록/ })).toBeVisible()
  expect(errors).toEqual([])
})
