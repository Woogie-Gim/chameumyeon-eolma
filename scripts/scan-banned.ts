// 금칙어 스캔. 위반 시 종료 코드 1
// 권유 표현과 금지 상품명: src 전체
// 티커 의심: 화면에 보일 수 있는 문자열(문자열 리터럴, 템플릿 문자열, JSX 텍스트)과 src/data/*.json만
// 코드 식별자와 주석은 티커 검사에서 제외
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, relative, resolve } from 'node:path'
import { parseAst } from 'rolldown/parseAst'

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

type ScanOptions = { tickers?: boolean; lineOffset?: number }

// 텍스트 한 덩어리 검사. tickers가 false면 티커 의심 규칙을 건너뛴다
export function scanText(text: string, file: string, allow: Set<string>, banned: string[], opts: ScanOptions = {}): Violation[] {
  const { tickers = true, lineOffset = 0 } = opts
  const v: Violation[] = []
  text.split(/\r?\n/).forEach((line, i) => {
    const at = lineOffset + i + 1
    for (const m of line.matchAll(SOLICIT)) v.push({ file, line: at, kind: '권유 표현', match: m[0] })
    if (tickers) {
      for (const m of line.matchAll(TICKER)) {
        if (!allow.has(m[0])) v.push({ file, line: at, kind: '티커 의심', match: m[0] })
      }
    }
    const lower = line.toLowerCase()
    for (const t of banned) {
      if (lower.includes(t.toLowerCase())) v.push({ file, line: at, kind: '금지 상품명', match: t })
    }
  })
  return v
}

export type VisibleString = { text: string; line: number }

type AstNode = { type?: string; start?: number; value?: unknown; source?: unknown; [k: string]: unknown }

// 모듈 경로 문자열(import, export from)은 화면 문자열이 아니므로 제외
const MODULE_NODES = new Set(['ImportDeclaration', 'ExportNamedDeclaration', 'ExportAllDeclaration', 'ImportExpression'])

// 소스에서 화면에 보일 수 있는 문자열을 뽑는다. line은 1부터
export function visibleStrings(source: string, file: string): VisibleString[] {
  const lang = file.endsWith('.tsx') ? 'tsx' : file.endsWith('.jsx') ? 'jsx' : file.endsWith('.ts') ? 'ts' : 'js'
  const ast = parseAst(source, { lang }, file) as unknown as AstNode
  const lineStarts = [0]
  for (let i = 0; i < source.length; i++) if (source[i] === '\n') lineStarts.push(i + 1)
  const lineOf = (pos: number) => {
    let lo = 0
    let hi = lineStarts.length - 1
    while (lo < hi) {
      const mid = (lo + hi + 1) >> 1
      if (lineStarts[mid] <= pos) lo = mid
      else hi = mid - 1
    }
    return lo + 1
  }
  const out: VisibleString[] = []
  const walk = (n: unknown, skip: unknown = null) => {
    if (!n || typeof n !== 'object') return
    if (Array.isArray(n)) {
      for (const c of n) walk(c, skip)
      return
    }
    const node = n as AstNode
    if (node === skip) return
    const at = typeof node.start === 'number' ? lineOf(node.start) : 0
    if (node.type === 'Literal' && typeof node.value === 'string') out.push({ text: node.value, line: at })
    else if (node.type === 'JSXText' && typeof node.value === 'string') out.push({ text: node.value, line: at })
    else if (node.type === 'TemplateElement') {
      const cooked = (node.value as { cooked?: string; raw: string }).cooked
      out.push({ text: cooked ?? (node.value as { raw: string }).raw, line: at })
    }
    const childSkip = node.type && MODULE_NODES.has(node.type) ? node.source : null
    for (const k of Object.keys(node)) if (k !== 'parent') walk(node[k], childSkip)
  }
  walk(ast)
  return out
}

const CODE_EXTS = ['.ts', '.tsx', '.js', '.jsx']

// 파일 종류별 검사. file은 저장소 기준 경로(슬래시)
export function scanFile(text: string, file: string, allow: Set<string>, banned: string[]): Violation[] {
  // 권유 표현과 금지 상품명은 모든 파일 전체 텍스트
  const base = scanText(text, file, allow, banned, { tickers: false })
  if (/^src\/data\/[^/]+\.json$/.test(file)) return scanText(text, file, allow, banned)
  if (!CODE_EXTS.some((e) => file.endsWith(e))) return base
  const tickers = visibleStrings(text, file).flatMap((s) =>
    scanText(s.text, file, allow, [], { lineOffset: s.line - 1 }).filter((x) => x.kind === '티커 의심'),
  )
  return [...base, ...tickers]
}

function main() {
  const allow = new Set(readList('allow-tokens.txt'))
  const banned = readList('banned-terms.txt')
  const files = TARGET_DIRS.flatMap((d) => walk(resolve(ROOT, d)))
  const violations = files.flatMap((f) =>
    scanFile(readFileSync(f, 'utf8'), relative(ROOT, f).replace(/\\/g, '/'), allow, banned),
  )
  for (const x of violations) console.log(`${x.file}:${x.line} [${x.kind}] ${x.match}`)
  console.log(`검사 파일 ${files.length}개, 위반 ${violations.length}건, 금지 상품명 ${banned.length}개 등록`)
  if (violations.length > 0) process.exit(1)
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(import.meta.filename)) main()
