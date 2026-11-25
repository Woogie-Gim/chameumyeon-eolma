// 금액 카운트업 보간. 시간 비율 t(0~1)에서 from→to 사이 정수 값
export const COUNT_UP_FIRST_MS = 800 // 처음 공개
export const COUNT_UP_CHANGE_MS = 300 // 기간, 모드 변경

// 처음 빠르고 끝에서 느려지는 곡선
export function easeOutCubic(t: number): number {
  const c = Math.min(1, Math.max(0, t))
  return 1 - (1 - c) ** 3
}

export function countUpAt(from: number, to: number, t: number): number {
  if (!Number.isFinite(t) || t >= 1) return to
  if (t <= 0) return from
  return Math.round(from + (to - from) * easeOutCubic(t))
}
