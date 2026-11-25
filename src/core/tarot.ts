// 재물운 타로. 22장 중 5장을 무작위로 펼치고 한 장을 고른다. 고른 카드는 그날 하루 고정
// 환산 결과와 소비 기록에는 관여하지 않는다
import tarot from '../data/tarot.json' with { type: 'json' }

export type TarotCardData = (typeof tarot)[number]
export type TarotStored = { date: string; cardId: number }
export type Random = () => number

export const TAROT_COUNT = tarot.length
export const SPREAD_SIZE = 5

// 펼친 카드 크기(px). 3D와 2D가 같은 값을 쓴다
export const SPREAD_CARD_W = 88
export const SPREAD_CARD_H = 138
// 카드 사이 최소 노출 폭. 겹쳐도 각 카드의 터치 영역이 44px 이상 남게 한다
export const SPREAD_MIN_STEP = 44
const SPREAD_MAX_STEP = SPREAD_CARD_W * 0.8
const SPREAD_PAD = 8
const SPREAD_MAX_TILT = 14 // 바깥 카드 기울기(도)
const SPREAD_ARC = 18 // 바깥 카드가 내려가는 정도(px)

export function isValidCardId(v: unknown, count = TAROT_COUNT): v is number {
  return typeof v === 'number' && Number.isInteger(v) && v >= 0 && v < count
}

// 서로 다른 n장을 섞인 순서로 뽑는다(부분 Fisher-Yates). random은 [0, 1) 값을 돌려주는 함수
export function drawSpread(random: Random = Math.random, n = SPREAD_SIZE, count = TAROT_COUNT): number[] {
  const deck = Array.from({ length: count }, (_, i) => i)
  const take = Math.min(n, count)
  for (let i = 0; i < take; i++) {
    const r = random()
    const u = Number.isFinite(r) ? Math.min(Math.max(r, 0), 0.999999) : 0
    const j = i + Math.floor(u * (count - i))
    ;[deck[i], deck[j]] = [deck[j], deck[i]]
  }
  return deck.slice(0, take)
}

// 오늘 이미 고른 카드 id. 없거나 날짜가 다르거나 잘못된 값이면 null
export function resolveToday(stored: TarotStored | null, todayKey: string, count = TAROT_COUNT): number | null {
  return stored && stored.date === todayKey && isValidCardId(stored.cardId, count) ? stored.cardId : null
}

export type SpreadSlot = { x: number; y: number; rot: number }

// 기울어진 카드가 차지하는 가로 폭(px)
export function tiltedWidth(tiltDeg: number, cardW = SPREAD_CARD_W, cardH = SPREAD_CARD_H): number {
  const r = (Math.abs(tiltDeg) * Math.PI) / 180
  return cardW * Math.cos(r) + cardH * Math.sin(r)
}

// 부채꼴 배치. 무대 가운데 기준 카드 중심 좌표(px)와 기울기(도)
// 바깥 카드의 기울어진 폭까지 무대 안에 들어가게 간격을 정하고, 좁으면 기울기를 줄인다. 최소 노출 폭은 항상 지킨다
export function spreadLayout(n: number, stageWidth: number, cardW = SPREAD_CARD_W, cardH = SPREAD_CARD_H): SpreadSlot[] {
  if (n <= 0) return []
  if (n === 1) return [{ x: 0, y: 0, rot: 0 }]
  const fitStep = (tilt: number) => (stageWidth - SPREAD_PAD * 2 - tiltedWidth(tilt, cardW, cardH)) / (n - 1)
  let tilt = SPREAD_MAX_TILT
  while (tilt > 0 && fitStep(tilt) < SPREAD_MIN_STEP) tilt -= 1
  const step = Math.max(SPREAD_MIN_STEP, Math.min(SPREAD_MAX_STEP, fitStep(tilt)))
  const mid = (n - 1) / 2
  return Array.from({ length: n }, (_, i) => {
    const k = (i - mid) / mid // -1 ~ 1
    return { x: (i - mid) * step, y: k * k * SPREAD_ARC * (tilt / SPREAD_MAX_TILT), rot: k * tilt }
  })
}

export function tarotCard(id: number): TarotCardData {
  return tarot.find((t) => t.id === id) ?? tarot[0]
}
