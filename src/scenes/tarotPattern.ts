// 카드 앞면 무늬. 카드 id로 별 개수와 배치를 정한다. 3D와 2D가 같은 배치를 쓴다
// 좌표는 카드 중심 기준, 카드 폭 1 단위

export type TarotPattern = { stars: { x: number; y: number; r: number }[]; centerR: number }

const FULL_TURN = Math.PI * 2

export function tarotPattern(id: number): TarotPattern {
  const count = 3 + (id % 6) // 3~8개
  const ring = 0.3
  const offset = ((id % 4) / 4) * (FULL_TURN / count)
  const stars = Array.from({ length: count }, (_, i) => {
    const a = offset + (i / count) * FULL_TURN
    return { x: Math.cos(a) * ring, y: Math.sin(a) * ring, r: i % 2 ? 0.05 : 0.07 }
  })
  return { stars, centerR: 0.1 + (id % 3) * 0.03 }
}

// 다섯 꼭짓점 별 윤곽 좌표(바깥, 안쪽 교대)
export function starPoints(r: number): [number, number][] {
  return Array.from({ length: 10 }, (_, i) => {
    const a = Math.PI / 2 + (i / 10) * FULL_TURN
    const rr = i % 2 ? r * 0.45 : r
    return [Math.cos(a) * rr, Math.sin(a) * rr]
  })
}
