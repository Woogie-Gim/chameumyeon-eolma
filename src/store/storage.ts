// localStorage 래퍼. 날짜, 품목 id, 금액, 선택 결과, 설정만 저장한다
import rates from '../data/rates.json' with { type: 'json' }
import type { Choice, LogRecord } from '../core/stats.ts'
import { isValidCardId, type TarotStored } from '../core/tarot.ts'

export type KeyValue = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>
export type Settings = { depositRate: number; savingsRate: number; reduce3d: boolean }

const RECORDS_KEY = 'chameum.records.v1'
const SETTINGS_KEY = 'chameum.settings.v1'
// 타로는 마지막으로 뽑은 날짜와 카드 id 하나만 덮어쓴다(기록 누적 없음)
const TAROT_KEY = 'chameum.tarot.v1'

export const DEFAULT_SETTINGS: Settings = {
  depositRate: rates.deposit.default,
  savingsRate: rates.savings.default,
  reduce3d: false,
}

const clamp = (v: unknown, min: number, max: number, fallback: number) =>
  typeof v === 'number' && Number.isFinite(v) ? Math.min(max, Math.max(min, v)) : fallback

const isChoice = (v: unknown): v is Choice => v === 'saved' || v === 'spent'

// 허용 필드만 골라낸다
function sanitizeRecord(v: unknown): LogRecord | null {
  if (!v || typeof v !== 'object') return null
  const r = v as Record<string, unknown>
  if (typeof r.date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(r.date)) return null
  if (typeof r.itemId !== 'string' || !/^[a-z]+$/.test(r.itemId)) return null
  if (typeof r.amount !== 'number' || !Number.isInteger(r.amount) || r.amount < 0) return null
  if (!isChoice(r.choice)) return null
  return { date: r.date, itemId: r.itemId, amount: r.amount, choice: r.choice }
}

function sanitizeTarot(v: unknown): TarotStored | null {
  if (!v || typeof v !== 'object') return null
  const t = v as Record<string, unknown>
  if (typeof t.date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(t.date)) return null
  if (!isValidCardId(t.cardId)) return null
  return { date: t.date, cardId: t.cardId }
}

function sanitizeSettings(v: unknown): Settings {
  const s = (v && typeof v === 'object' ? v : {}) as Record<string, unknown>
  return {
    depositRate: clamp(s.depositRate, rates.deposit.min, rates.deposit.max, DEFAULT_SETTINGS.depositRate),
    savingsRate: clamp(s.savingsRate, rates.savings.min, rates.savings.max, DEFAULT_SETTINGS.savingsRate),
    reduce3d: typeof s.reduce3d === 'boolean' ? s.reduce3d : DEFAULT_SETTINGS.reduce3d,
  }
}

export function createStore(kv: KeyValue | null) {
  const read = (key: string): unknown => {
    try {
      const raw = kv?.getItem(key)
      return raw ? JSON.parse(raw) : null
    } catch {
      return null
    }
  }
  const write = (key: string, value: unknown) => {
    try {
      kv?.setItem(key, JSON.stringify(value))
    } catch {
      // 저장 실패는 무시
    }
  }

  const getRecords = (): LogRecord[] => {
    const v = read(RECORDS_KEY)
    return Array.isArray(v) ? v.map(sanitizeRecord).filter((r): r is LogRecord => r !== null) : []
  }

  return {
    getRecords,
    addRecord(r: LogRecord) {
      const clean = sanitizeRecord(r)
      if (clean) write(RECORDS_KEY, [...getRecords(), clean])
    },
    getSettings: (): Settings => sanitizeSettings(read(SETTINGS_KEY)),
    saveSettings(s: Settings) {
      write(SETTINGS_KEY, sanitizeSettings(s))
    },
    getTarot: (): TarotStored | null => sanitizeTarot(read(TAROT_KEY)),
    saveTarot(t: TarotStored) {
      const clean = sanitizeTarot(t)
      if (clean) write(TAROT_KEY, clean)
    },
    resetAll() {
      try {
        kv?.removeItem(RECORDS_KEY)
        kv?.removeItem(SETTINGS_KEY)
        kv?.removeItem(TAROT_KEY)
      } catch {
        // 무시
      }
    },
  }
}

export type Store = ReturnType<typeof createStore>

function browserStorage(): KeyValue | null {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage
  } catch {
    return null
  }
}

export const store = createStore(browserStorage())
