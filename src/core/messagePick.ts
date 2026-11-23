// 문구 풀에서 한마디 선택. 톤은 무작위
import type { AmountBand } from './calc.ts'

export type Tone = 'funny' | 'calm' | 'stern'
export type Message = { id: string; category: string; amountBand: string; tone: string; template: string }

const TONE_LIST: Tone[] = ['funny', 'calm', 'stern']

export function pickMessage(messages: Message[], category: string, band: AmountBand, rand: () => number = Math.random): Message {
  const tone = TONE_LIST[Math.min(TONE_LIST.length - 1, Math.floor(rand() * TONE_LIST.length))]
  const pool = messages.filter((m) => m.category === category && m.amountBand === band && m.tone === tone)
  if (pool.length === 0) throw new Error('문구 후보 없음')
  return pool[Math.min(pool.length - 1, Math.floor(rand() * pool.length))]
}

export type EtfMessage = { id: string; category: string; tone: string; template: string }

// ETF 타임머신 전용 풀. 과거 시제 문구
export function pickEtfMessage(messages: EtfMessage[], category: string, rand: () => number = Math.random): EtfMessage {
  const tone = TONE_LIST[Math.min(TONE_LIST.length - 1, Math.floor(rand() * TONE_LIST.length))]
  const pool = messages.filter((m) => m.category === category && m.tone === tone)
  if (pool.length === 0) throw new Error('문구 후보 없음')
  return pool[Math.min(pool.length - 1, Math.floor(rand() * pool.length))]
}
