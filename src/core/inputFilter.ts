// 직접 입력 품목 판정. 결과에는 입력 원문을 담지 않는다
import blocked from '../data/blockedHashes.json' with { type: 'json' }
import items from '../data/items.json' with { type: 'json' }
import { FILTER_MESSAGES, OTHER_LABEL } from './copy.ts'
import { hashTerm, normalize } from './textNorm.ts'

export { hashTerm, normalize }

export type Category = 'hunger' | 'stress' | 'reward' | 'impulse'
export type RejectReason = keyof typeof FILTER_MESSAGES

export type FilterResult =
  | { status: 'allowed'; itemId: string; label: string; category: Category }
  | { status: 'rejected'; reason: RejectReason; message: string }
  | { status: 'other'; itemId: 'other'; label: string; category: Category }

export const MAX_INPUT_LENGTH = 20

// 품목명 앞뒤에 붙어도 되는 일반 수식어
const MODIFIERS = [
  '아이스', '따뜻한', '따뜻', '차가운', '시원한', '뜨거운', '핫',
  '매운', '매콤한', '매콤', '순한', '달달한', '달콤한',
  '양념', '간장', '후라이드', '반반', '로제', '크림', '치즈', '마늘',
  '큰', '작은', '라지', '레귤러', '대', '중', '소', '곱빼기', '미니', '사이즈업',
  '세트', '추가', '배달', '포장', '수제', '디카페인', '신상', '새', '오늘', '저녁', '점심', '아침',
].sort((a, b) => b.length - a.length)

// 수량 표현
const COUNTER = '(개|잔|인분|마리|판|세트|병|캔|봉지|그릇|조각|박스|벌|켤레|장|권|번)'
const QUANTITY = new RegExp(`([0-9]+${COUNTER}?|(한|두|세|네|다섯|여섯|일곱|여덟|아홉|열)${COUNTER})`, 'g')

type Item = { id: string; label: string; category: string; aliases: string[] }

// 정규화된 품목어 → 품목. 긴 단어 우선
const terms: { word: string; item: Item }[] = (items as Item[])
  .flatMap((item) => [item.label, ...item.aliases].map((w) => ({ word: normalize(w), item })))
  .sort((a, b) => b.word.length - a.word.length)

const blockedSet = new Set(blocked.hashes)

function hasBlockedTerm(s: string): boolean {
  const chars = [...s]
  for (let i = 0; i < chars.length; i++) {
    for (let len = 2; len <= blocked.maxLen && i + len <= chars.length; len++) {
      if (blockedSet.has(hashTerm(chars.slice(i, i + len).join('')))) return true
    }
  }
  return false
}

function stripModifiers(s: string): string {
  let out = s
  for (const m of MODIFIERS) out = out.split(m).join('')
  return out
}

const reject = (reason: RejectReason): FilterResult => ({ status: 'rejected', reason, message: FILTER_MESSAGES[reason] })
const allowed = (item: Item): FilterResult => ({
  status: 'allowed',
  itemId: item.id,
  label: item.label,
  category: item.category as Category,
})

export function filterInput(raw: string): FilterResult {
  const trimmed = raw.trim()
  if ([...trimmed].length > MAX_INPUT_LENGTH) return reject('tooLong')
  if (/[a-z]/i.test(trimmed)) return reject('latin')

  const norm = normalize(trimmed)
  if (norm.length === 0) return reject('empty')
  if (hasBlockedTerm(norm)) return reject('brand')

  const s = norm.replace(QUANTITY, '')
  if (s.length === 0) return reject('empty')

  // 정확히 일치
  const exact = terms.find((t) => t.word === s)
  if (exact) return allowed(exact.item)

  // 두 글자 이상 품목어 포함 시 나머지가 수식어뿐이면 허용, 아니면 상호 의심
  const hit = terms.find((t) => t.word.length >= 2 && s.includes(t.word))
  if (hit) {
    const rest = stripModifiers(s.replace(hit.word, ''))
    return rest.length === 0 ? allowed(hit.item) : reject('brand')
  }

  return { status: 'other', itemId: 'other', label: OTHER_LABEL, category: 'impulse' }
}
