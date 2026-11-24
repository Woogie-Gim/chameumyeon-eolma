// 저울 기울기. 지금 쓰는 금액과 환산 금액의 비율로 정한다
// 반환값은 라디안. 양수면 환산 코인 쪽, 음수면 쓰는 금액 쪽이 내려간다
import { formatWon } from './format.ts'

export const RATIO_CAP = 3 // 이 배율 이상이면 최대 기울기
export const MAX_TILT = 0.35 // 약 20도

const valid = (v: number) => Number.isFinite(v) && v >= 0

export function scaleTilt(spend: number, converted: number): number {
  if (!valid(spend) || !valid(converted)) return 0
  if (spend === 0 && converted === 0) return 0
  if (spend === 0) return MAX_TILT
  if (converted === 0) return -MAX_TILT
  const r = Math.min(RATIO_CAP, Math.max(1 / RATIO_CAP, converted / spend))
  if (r === RATIO_CAP) return MAX_TILT
  if (r === 1 / RATIO_CAP) return -MAX_TILT
  return (MAX_TILT * Math.log(r)) / Math.log(RATIO_CAP)
}

export type ScaleSide = 'converted' | 'spend' | 'level'

// 내려간 쪽
export function scaleSide(spend: number, converted: number): ScaleSide {
  const t = scaleTilt(spend, converted)
  return t > 0 ? 'converted' : t < 0 ? 'spend' : 'level'
}

const SIDE_TEXT: Record<ScaleSide, string> = { converted: '환산 쪽으로 기울어짐', spend: '쓰는 금액 쪽으로 기울어짐', level: '수평' }

// 저울 대체 텍스트
export function scaleAltText(spendLabel: string, spend: number, converted: number): string {
  return `${spendLabel} ${formatWon(spend)}, 환산 금액 약 ${formatWon(converted)}. ${SIDE_TEXT[scaleSide(spend, converted)]}`
}
