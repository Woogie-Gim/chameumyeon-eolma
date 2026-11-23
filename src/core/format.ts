// 금액과 비율 표시 포맷

// 부동소수 오차 보정 후 원 단위 반올림
export function roundWon(n: number): number {
  return Math.round(Number(n.toFixed(6)))
}

// 천 단위 콤마. 정수로 반올림 후 표시
export function formatNumber(n: number): string {
  const v = roundWon(n)
  const sign = v < 0 ? '-' : ''
  return sign + String(Math.abs(v)).replace(/\B(?=(\d{3})+(?!\d))/g, ',')
}

export function formatWon(n: number): string {
  return `${formatNumber(n)}원`
}

// 소수 비율을 퍼센트로. 양수는 + 부호
export function formatPercent(ratio: number, digits = 1): string {
  const p = Number((ratio * 100).toFixed(digits))
  const body = Math.abs(p).toFixed(digits)
  if (p > 0) return `+${body}%`
  if (p < 0) return `-${body}%`
  return `${body}%`
}
