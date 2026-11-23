// 환산 금액이 원금의 몇 배인지로 코인 수 결정

export const COIN_BASE = 10 // 배율 1배일 때
export const COIN_GROWTH = 40 // 배율 1 증가당 추가
export const COIN_MAX = 80 // 상한

export function coinCount(principal: number, value: number): number {
  if (!Number.isFinite(principal) || !Number.isFinite(value) || principal <= 0 || value <= 0) return 0
  const ratio = value / principal
  if (ratio < 1) return Math.max(1, Math.round(COIN_BASE * ratio))
  return Math.min(COIN_MAX, COIN_BASE + Math.round((ratio - 1) * COIN_GROWTH))
}
