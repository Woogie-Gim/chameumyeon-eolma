// 환산 계산 순수 함수
import returnsJson from '../data/returns.json' with { type: 'json' }
import { roundWon } from './format.ts'

export const MAX_AMOUNT = 100_000_000
export const MAX_YEARS = 50
// 금액 구간 경계(원)
export const BAND_MID_FROM = 10_000
export const BAND_HIGH_FROM = 50_000
// ETF형 최소 보유 연수. 시작 연도는 마지막 연도 직전까지
export const ETF_MIN_YEARS = 2

export type AmountBand = 'low' | 'mid' | 'high'

export type AssetType = {
  id: string
  label: string
  annualReturns: Record<string, number | null>
  isSample: boolean
  sampleYears: number[]
  source: string
}
export type ReturnsData = { asOf: string; assetTypes: AssetType[] }

export type TimeMachineResult = {
  value: number
  multiplier: number
  cumulativeReturn: number
  startYear: number
  endYear: number // 기준 연도(마지막 데이터 연도)
  years: number
  isSample: boolean
}

function assertPrincipal(principal: number) {
  if (!Number.isInteger(principal) || principal < 0 || principal > MAX_AMOUNT) {
    throw new RangeError(`금액은 0원 이상 ${MAX_AMOUNT}원 이하 정수여야 함`)
  }
}

function assertRateAndYears(annualRate: number, years: number) {
  if (!Number.isFinite(annualRate) || annualRate < 0 || annualRate > 1) {
    throw new RangeError('이율은 0 이상 1 이하 소수여야 함')
  }
  if (!Number.isInteger(years) || years < 0 || years > MAX_YEARS) {
    throw new RangeError(`기간은 0~${MAX_YEARS}년 정수여야 함`)
  }
}

// 예금형: 일시 예치, 연 복리. annualRate는 소수(2.88% → 0.0288)
export function futureValueCompound(principal: number, annualRate: number, years: number): number {
  assertPrincipal(principal)
  assertRateAndYears(annualRate, years)
  return roundWon(principal * (1 + annualRate) ** years)
}

export type InstallmentResult = { totalPaid: number; value: number }

// 적금형: 매월 초 같은 금액 납입, 월 이율 = 연 이율/12 근사, 월 복리
export function installmentFutureValue(monthly: number, annualRate: number, years: number): InstallmentResult {
  assertPrincipal(monthly)
  assertRateAndYears(annualRate, years)
  const months = years * 12
  const r = annualRate / 12
  const factor = r === 0 ? months : ((1 + r) * ((1 + r) ** months - 1)) / r
  return { totalPaid: monthly * months, value: roundWon(monthly * factor) }
}

export type StartYearRange = { min: number; max: number; endYear: number }

function findAsset(assetTypeId: string, data: ReturnsData): AssetType {
  const asset = data.assetTypes.find((a) => a.id === assetTypeId)
  if (!asset) throw new RangeError('알 수 없는 유형')
  return asset
}

// 선택 가능한 시작 연도 범위. max는 마지막 데이터 연도 직전
export function startYearRange(assetTypeId: string, data: ReturnsData = returnsJson as ReturnsData): StartYearRange {
  const years = Object.keys(findAsset(assetTypeId, data).annualReturns).map(Number)
  const endYear = Math.max(...years)
  return { min: Math.min(...years), max: endYear - (ETF_MIN_YEARS - 1), endYear }
}

// startYear 해 초에 넣어 마지막 데이터 연도 말까지 보유한 경우
export function timeMachine(
  principal: number,
  assetTypeId: string,
  startYear: number,
  data: ReturnsData = returnsJson as ReturnsData,
): TimeMachineResult {
  assertPrincipal(principal)
  const asset = findAsset(assetTypeId, data)
  const { min, max, endYear } = startYearRange(assetTypeId, data)
  if (!Number.isInteger(startYear) || startYear < min || startYear > max) {
    throw new RangeError(`시작 연도는 ${min}~${max} 범위여야 함`)
  }

  let multiplier = 1
  for (let y = startYear; y <= endYear; y++) {
    const r = asset.annualReturns[String(y)]
    if (r == null) throw new RangeError(`${y}년 데이터 없음`)
    multiplier *= 1 + r
  }

  return {
    value: roundWon(principal * multiplier),
    multiplier,
    cumulativeReturn: multiplier - 1,
    startYear,
    endYear,
    years: endYear - startYear + 1,
    isSample: asset.isSample,
  }
}

// 문구 선택용 금액 구간
export function amountBand(amount: number): AmountBand {
  if (amount < BAND_MID_FROM) return 'low'
  if (amount < BAND_HIGH_FROM) return 'mid'
  return 'high'
}
