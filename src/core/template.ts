// 문구 자리표시자 치환. {item} 뒤 조사는 받침에 맞춰 바꾼다

export type TemplateVars = {
  item?: string
  amount?: string // 포맷된 금액(원 포함)
  years?: number
  future?: string // 포맷된 금액(원 포함)
}

// 마지막 글자 받침 여부. 한글이 아니면 받침 없음으로 처리
export function hasBatchim(word: string): boolean {
  const code = word.charCodeAt(word.length - 1) - 0xac00
  if (code < 0 || code > 11171) return false
  return code % 28 !== 0
}

// ㄹ 받침 여부(으로/로 구분)
function hasRieul(word: string): boolean {
  const code = word.charCodeAt(word.length - 1) - 0xac00
  return code >= 0 && code <= 11171 && code % 28 === 8
}

// 받침 있을 때 형태 → 받침 없을 때 형태
const PARTICLES: [string, string][] = [
  ['이었', '였'],
  ['이라', '라'],
  ['으로', '로'],
  ['이', '가'],
  ['을', '를'],
  ['은', '는'],
  ['과', '와'],
]

function attach(item: string, particle: string): string {
  if (particle === '으로') return item + (hasBatchim(item) && !hasRieul(item) ? '으로' : '로')
  const pair = PARTICLES.find(([withB]) => withB === particle)
  if (!pair) return item + particle
  return item + (hasBatchim(item) ? pair[0] : pair[1])
}

const ITEM_RE = new RegExp(`\{item\}(${PARTICLES.map(([p]) => p).join('|')})?`, 'g')

export function fillTemplate(template: string, vars: TemplateVars): string {
  let out = template
  if (vars.item != null) {
    const item = vars.item
    out = out.replace(ITEM_RE, (_, p: string | undefined) => (p ? attach(item, p) : item))
  }
  if (vars.amount != null) out = out.split('{amount}').join(vars.amount)
  if (vars.years != null) out = out.split('{years}').join(String(vars.years))
  if (vars.future != null) out = out.split('{future}').join(vars.future)
  return out
}
