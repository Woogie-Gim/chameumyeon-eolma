// 화면 간 공유 타입
import type { Category } from '../core/inputFilter.ts'

// 환산 대상. label은 사전 일반 명칭 또는 기타 소비
export type Draft = { itemId: string; label: string; category: Category; amount: number }

export const CATEGORY_LABELS: Record<Category, string> = {
  hunger: '배고픔',
  stress: '스트레스',
  reward: '보상',
  impulse: '충동',
}
