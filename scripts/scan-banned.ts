// 금칙어 스캔. src 전체 대상, 위반 시 종료 코드 1
// 입력 필터 테스트 연동은 Phase 5에서 추가
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, relative, resolve } from 'node:path'

const ROOT = resolve(import.meta.dirname, '..')
const TARGET_DIRS = ['src']
const EXTS = ['.ts', '.tsx', '.js', '.jsx', '.json', '.css', '.html', '.md']

// 권유 표현
const SOLICIT = /(사세요|사십시오|넣으세요|넣으십시오|투자하세요|투자하십시오|가입하세요|구매하세요|매수|매도)/g
// 티커 의심 토큰: 앞뒤가 영숫자가 아닌 대문자 2~5자
const TICKER = /(?<![A-Za-z0-9_])[A-Z]{2,5}(?![A-Za-z0-9_])/g

function readList(file: string): string[] {
  try {
    return readFileSync(resolve(ROOT, 'scripts', file), 'utf8')
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter((l) => l && !l.startsWith('#'))
  } catch {
    return []
  }
}

function walk(dir: string): string[] {
  const out: string[] = []
  for (const name of readdirSync(dir)) {
    const p = join(dir, name)
    if (statSync(p).isDirectory()) out.push(...walk(p))
    else if (EXTS.some((e) => p.endsWith(e))) out.push(p)
  }
  return out
}

export type Violation = { file: string; line: number; kind: string; match: string }

export function scanText(text: string, file: string, allow: Set<string>, banned: string[]): Violation[] {
  const v: Violation[] = []
  text.split(/\r?\n/).forEach((line, i) => {
    for (const m of line.matchAll(SOLICIT)) v.push({ file, line: i + 1, kind: '권유 표현', match: m[0] })
    for (const m of line.matchAll(TICKER)) {
      if (!allow.has(m[0])) v.push({ file, line: i + 1, kind: '티커 의심', match: m[0] })
    }
    const lower = line.toLowerCase()
    for (const t of banned) {
      if (lower.includes(t.toLowerCase())) v.push({ file, line: i + 1, kind: '금지 상품명', match: t })
    }
  })
  return v
}

function main() {
  const allow = new Set(readList('allow-tokens.txt'))
  const banned = readList('banned-terms.txt')
  const files = TARGET_DIRS.flatMap((d) => walk(resolve(ROOT, d)))
  const violations = files.flatMap((f) =>
    scanText(readFileSync(f, 'utf8'), relative(ROOT, f).replace(/\\/g, '/'), allow, banned),
  )
  for (const x of violations) console.log(`${x.file}:${x.line} [${x.kind}] ${x.match}`)
  console.log(`검사 파일 ${files.length}개, 위반 ${violations.length}건, 금지 상품명 ${banned.length}개 등록`)
  if (violations.length > 0) process.exit(1)
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(import.meta.filename)) main()
