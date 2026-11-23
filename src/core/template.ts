// 문구 자리표시자 치환. {item}, {amount}, {future} 뒤 조사는 값의 받침에 맞춰 바꾼다
// 템플릿 규약: 조사는 받침형(이, 을, 은, 과, 으로, 이라, 이었)으로 쓴다

export type TemplateVars = {
  item?: string
  amount?: string // 포맷된 금액(원 포함)
  years?: number
  future?: string // 포맷된 금액(원 포함)
  startYear?: number // ETF 문구 전용
}

function lastSyllable(word: string): number {
  const code = word.charCodeAt(word.length - 1) - 0xac00
  return code >= 0 && code <= 11171 ? code : -1
}

// 마지막 글자 받침 여부. 한글이 아니면 받침 없음으로 처리
export function hasBatchim(word: string): boolean {
  const c = lastSyllable(word)
  return c >= 0 && c % 28 !== 0
}

// ㄹ 받침 여부(으로/로 구분)
export function hasRieul(word: string): boolean {
  const c = lastSyllable(word)
  return c >= 0 && c % 28 === 8
}

// 받침 있을 때 형태 → 받침 없을 때 형태. 긴 것 먼저
const PARTICLES: [string, string][] = [
  ['이었', '였'],
  ['이라', '라'],
  ['으로', '로'],
  ['이', '가'],
  ['을', '를'],
  ['은', '는'],
  ['과', '와'],
]

export function attachParticle(word: string, particle: string): string {
  if (particle === '으로') return word + (hasBatchim(word) && !hasRieul(word) ? '으로' : '로')
  const pair = PARTICLES.find(([withB]) => withB === particle)
  if (!pair) return word + particle
  return word + (hasBatchim(word) ? pair[0] : pair[1])
}

const PARTICLE_ALT = PARTICLES.map(([p]) => p).join('|')

function replaceWithParticle(text: string, key: string, value: string): string {
  const re = new RegExp(`\{${key}\}(${PARTICLE_ALT})?`, 'g')
  return text.replace(re, (_, p: string | undefined) => (p ? attachParticle(value, p) : value))
}

export function fillTemplate(template: string, vars: TemplateVars): string {
  let out = template
  if (vars.item != null) out = replaceWithParticle(out, 'item', vars.item)
  if (vars.amount != null) out = replaceWithParticle(out, 'amount', vars.amount)
  if (vars.future != null) out = replaceWithParticle(out, 'future', vars.future)
  // {years}, {startYear} 뒤에는 항상 '년'이 온다
  if (vars.years != null) out = out.split('{years}').join(String(vars.years))
  if (vars.startYear != null) out = out.split('{startYear}').join(String(vars.startYear))
  return out
}
