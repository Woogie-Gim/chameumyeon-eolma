// 펼침 카드 움직임 값. 3D 장면과 DOM 버튼이 같은 값을 써서 위치가 어긋나지 않게 한다
export const SPREAD_DIM = 0.35 // 고르지 않은 카드 투명도
export const PICK_LIFT = 18 // 고른 카드가 올라오는 높이(px)
export const HOVER_LIFT = 10 // 가리키거나 포커스한 카드가 올라오는 높이(px)

// 카드 index의 들어 올림 높이. 고른 뒤에는 고른 카드만 올라온다
export function liftOf(index: number, picked: number | null, active: number | null): number {
  if (picked !== null) return picked === index ? PICK_LIFT : 0
  return active === index ? HOVER_LIFT : 0
}
