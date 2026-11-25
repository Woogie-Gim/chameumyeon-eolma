// 재물운 타로. 날짜 기반 시드로 하루 한 장. 환산과 기록에는 관여하지 않는다
import tarot from '../data/tarot.json' with { type: 'json' }
import { fillTemplate } from './template.ts'

export type TarotCardData = (typeof tarot)[number]
export type TarotStored = { date: string; cardId: number }

export const TAROT_COUNT = tarot.length

// 타로는 입력 금액과 무관하므로 {amount}는 일반 단어로 채운다
const AMOUNT_WORD = '금액'

// FNV-1a 32비트 해시로 날짜 키(YYYY-MM-DD)를 카드 id로 변환
export function dailyCardId(dateKey: string, count = TAROT_COUNT): number {
  let h = 0x811c9dc5
  for (let i = 0; i < dateKey.length; i++) {
    h ^= dateKey.charCodeAt(i)
    h = Math.imul(h, 0x01000193) >>> 0
  }
  return h % count
}

export function isValidCardId(v: unknown, count = TAROT_COUNT): v is number {
  return typeof v === 'number' && Number.isInteger(v) && v >= 0 && v < count
}

// 오늘 뽑은 기록이 있으면 그 카드, 없으면 오늘 시드 카드(아직 안 뽑음)
export function resolveToday(stored: TarotStored | null, todayKey: string, count = TAROT_COUNT): { cardId: number; drawn: boolean } {
  if (stored && stored.date === todayKey && isValidCardId(stored.cardId, count)) return { cardId: stored.cardId, drawn: true }
  return { cardId: dailyCardId(todayKey, count), drawn: false }
}

export function tarotCard(id: number): TarotCardData {
  return tarot.find((t) => t.id === id) ?? tarot[0]
}

export function tarotAdvice(card: TarotCardData): string {
  return fillTemplate(card.adviceTemplate, { amount: AMOUNT_WORD })
}
