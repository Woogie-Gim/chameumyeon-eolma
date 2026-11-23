// 입력 → 결과 → 참았어요 → 기록 시나리오
import { expect, test } from '@playwright/test'
import { shot } from './helpers.ts'

const DISCLAIMER = '가정 시뮬레이션이며 수익을 보장하지 않습니다. 과거 성과는 미래를 보장하지 않습니다.'
const ETF_DISCLAIMER = '지수 가격 기준이며 배당, 보수, 환율은 반영하지 않았습니다.'
const BRAND = '스타벅스'

test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true })

test('상호명 거부, 환산, 참았어요, 기록 확인', async ({ page }) => {
  await page.goto('/')
  const free = page.getByLabel('품목 직접 입력')

  // 상호명 입력은 거부되고 원문은 남지 않는다
  await free.fill(BRAND)
  await page.getByRole('button', { name: '확인' }).click()
  await expect(page.getByRole('alert')).toContainText('일반 명칭')
  await expect(free).toHaveValue('')
  await expect(page.locator('body')).not.toContainText(BRAND)

  // 일반 명칭 입력
  await free.fill('치킨')
  await page.getByRole('button', { name: '확인' }).click()
  await expect(page.getByRole('status')).toContainText('치킨으로 인식했어요')
  await page.getByLabel('금액').fill('18000')
  await expect(page.getByLabel('금액')).toHaveValue('18,000')
  await shot(page, 'input')

  // 결과
  await page.getByRole('button', { name: '환산하기' }).click()
  await expect(page.getByRole('heading', { name: /치킨 18,000원/ })).toBeVisible()
  await expect(page.getByText('적용 이율 연')).toBeVisible()
  await expect(page.getByTestId('result-value')).toContainText('원')
  await expect(page.getByTestId('disclaimer')).toHaveText(DISCLAIMER)
  await shot(page, 'result')

  // 적금형
  await page.getByRole('tab', { name: '적금형' }).click()
  await expect(page.getByText(/총 납입액/)).toBeVisible()

  // ETF 타임머신형은 전용 고정 문구 표시
  await page.getByRole('tab', { name: 'ETF 타임머신형' }).click()
  await expect(page.getByTestId('etf-disclaimer')).toHaveText(ETF_DISCLAIMER)
  await expect(page.getByTestId('disclaimer')).toHaveText(DISCLAIMER)
  await expect(page.getByText(/상승률/)).toBeVisible()

  // 선택과 기록
  await page.getByRole('button', { name: '다음' }).click()
  await expect(page.getByRole('button', { name: '먹었어요' })).toBeVisible()
  await page.getByRole('button', { name: '참았어요' }).click()
  await expect(page.getByRole('heading', { name: '기록' })).toBeVisible()
  await expect(page.getByTestId('total-saved')).toHaveText('18,000원')
  await expect(page.getByTestId('streak')).toHaveText('1일')
  await expect(page.locator('.record-list')).toContainText('치킨')
  await shot(page, 'log')

  // 저장소에는 원문이 없고 허용 필드만 있다
  const saved = await page.evaluate(() => JSON.stringify({ ...localStorage }))
  expect(saved).not.toContain(BRAND)
  const records = await page.evaluate(() => JSON.parse(localStorage.getItem('chameum.records.v1') ?? '[]'))
  expect(records).toHaveLength(1)
  expect(Object.keys(records[0]).sort()).toEqual(['amount', 'choice', 'date', 'itemId'])
  expect(records[0]).toMatchObject({ itemId: 'chicken', amount: 18000, choice: 'saved' })
})

test('사전에 없는 단어는 기타 소비로 받는다', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: '충동' }).click()
  await page.getByLabel('품목 직접 입력').fill('우주여행')
  await page.getByRole('button', { name: '확인' }).click()
  await expect(page.getByRole('status')).toContainText('기타 소비')
  await expect(page.locator('body')).not.toContainText('우주여행')
  await page.getByLabel('금액').fill('5000')
  await expect(page.getByRole('button', { name: '환산하기' })).toBeEnabled()
})
