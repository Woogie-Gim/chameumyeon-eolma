// 앱인토스 콘솔 입력값 점검과 복붙용 정리. 원본은 docs/store/console.json
// 글자 수(공백 포함, 코드 포인트 기준), 주요 기능 이름 규칙, 금칙어를 검사해 docs/SUBMISSION.md의 표시 구간을 다시 쓴다
// 실행: npm run store:console
import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { readList, scanText } from './scan-banned.ts'

const ROOT = resolve(import.meta.dirname, '..')
const SOURCE = resolve(ROOT, 'docs/store/console.json')
const DOC = resolve(ROOT, 'docs/SUBMISSION.md')
export const START = '<!-- console:start -->'
export const END = '<!-- console:end -->'

export type Feature = { ko: string; en: string; url: string }
export type ConsoleFields = {
  appName: string
  appNameEn: string
  subtitle: string
  description: string | null
  releaseNotes: string
  memo: string
  keywords: string[]
  category: string
  features: Feature[]
}

// limit이 null이면 가이드에서 글자 수 제한을 확인하지 못한 항목(표에 미확인으로 표시)
export type Check = { field: string; value: string; count: number; noSpace: number; limit: number | null; ok: boolean; note: string }

const len = (s: string) => [...s].length
const lenNoSpace = (s: string) => [...s.replace(/\s/g, '')].length
// 주요 기능 이름: 특수문자는 :와 .만, 이모지 불가(가이드 기준). 한글, 영문, 숫자, 공백 외 문자를 찾는다
const badFeatureChars = (s: string) => [...s].filter((c) => !/[\p{Script=Hangul}A-Za-z0-9\s:.]/u.test(c))

export function readFields(): ConsoleFields {
  return JSON.parse(readFileSync(SOURCE, 'utf8')) as ConsoleFields
}

export function checkFields(f: ConsoleFields): Check[] {
  const row = (field: string, value: string, limit: number | null, extra: string[] = []): Check => {
    const count = len(value)
    const notes = [...extra]
    if (limit !== null && count > limit) notes.unshift(`${count - limit}자 초과`)
    return { field, value, count, noSpace: lenNoSpace(value), limit, ok: notes.length === 0, note: notes.join(', ') }
  }
  // 가이드(console-workspace): 영어 이름은 3단어 이하, 부제에는 느낌표를 쓰지 않는다
  const words = f.appNameEn.trim().split(/\s+/).length
  const rows: Check[] = [
    row('앱 이름', f.appName, 10),
    row('영어 앱 이름', f.appNameEn, 15, words > 3 ? [`${words}단어(3단어 이하)`] : []),
    row('부제', f.subtitle, 20, /[!！]/.test(f.subtitle) ? ['느낌표 사용 불가'] : []),
  ]
  if (f.description) rows.push(row('상세 설명', f.description, null))
  f.features.forEach((ft, i) => {
    const koBad = badFeatureChars(ft.ko)
    const enBad = badFeatureChars(ft.en)
    rows.push(row(`기능 ${i + 1} 한국어`, ft.ko, 10, koBad.length ? [`허용 안 되는 문자 ${koBad.join(' ')}`] : []))
    rows.push(
      row(`기능 ${i + 1} 영어`, ft.en, 15, [
        ...(enBad.length ? [`허용 안 되는 문자 ${enBad.join(' ')}`] : []),
        ...(/^[A-Z]/.test(ft.en) ? [] : ['첫 글자 대문자 아님']),
      ]),
    )
  })
  return rows
}

// 화면에 나갈 모든 문구의 금칙어 위반
export function scanFields(f: ConsoleFields) {
  const allow = new Set(readList('allow-tokens.txt'))
  const banned = readList('banned-terms.txt')
  const texts = [f.appName, f.appNameEn, f.subtitle, f.description ?? '', f.releaseNotes, f.memo, f.category, ...f.keywords, ...f.features.flatMap((x) => [x.ko, x.en])]
  return scanText(texts.join('\n'), 'console.json', allow, banned)
}

const code = (s: string) => ['```text', s, '```'].join('\n')

// SUBMISSION.md에 넣을 구간
export function buildBlock(f: ConsoleFields): string {
  const checks = checkFields(f)
  const violations = scanFields(f)
  const table = [
    '| 항목 | 값 | 글자 수(공백 포함) | 공백 제외 | 제한 | 결과 |',
    '| --- | --- | --- | --- | --- | --- |',
    ...checks.map((c) => {
      // 긴 값은 표에서 앞부분만 보이고 전체는 아래 복붙 칸에 있다
      const shown = [...c.value].length > 24 ? `${[...c.value].slice(0, 24).join('')}…` : c.value
      const result = c.limit === null ? '제한 미확인' : c.ok ? '통과' : `**미통과**: ${c.note}`
      return `| ${c.field} | ${shown} | ${c.count} | ${c.noSpace} | ${c.limit ?? '미확인'} | ${result} |`
    }),
  ].join('\n')
  return [
    START,
    '<!-- 이 구간은 npm run store:console이 docs/store/console.json으로 다시 쓴다. 직접 고치지 않는다 -->',
    '',
    '### 글자 수 점검',
    '',
    '글자 수는 코드 포인트 기준으로 센다. 콘솔이 공백을 세는지는 가이드에 없어 두 값을 함께 적는다. 결과는 공백 포함 기준이다. 상세 설명은 가이드(console-workspace)에 글자 수 제한이 없어 미확인으로 둔다.',
    '',
    table,
    '',
    `금칙어 스캔(앱과 같은 규칙): ${violations.length === 0 ? '위반 0건' : violations.map((v) => `${v.kind} ${v.match}`).join(', ')}`,
    '',
    '### 앱 이름',
    '',
    code(f.appName),
    '',
    '### 영어 앱 이름',
    '',
    code(f.appNameEn),
    '',
    '### 부제',
    '',
    code(f.subtitle),
    '',
    '### 상세 설명',
    '',
    f.description ? code(f.description) : 'TODO(확정 문구 필요): 이전에 정한 문구를 저장소에서 찾지 못했다. `docs/store/console.json`의 `description`에 넣고 `npm run store:console`을 실행한다.',
    '',
    '### 출시 노트 (초안)',
    '',
    code(f.releaseNotes),
    '',
    '### 메모 (심사 담당자용, 초안)',
    '',
    code(f.memo),
    '',
    '### 검색 키워드',
    '',
    code(f.keywords.join(', ')),
    '',
    '### 카테고리',
    '',
    code(f.category),
    '',
    '### 주요 기능',
    '',
    '| # | 이름(한국어) | 이름(영어) | 주소 |',
    '| --- | --- | --- | --- |',
    ...f.features.map((x, i) => `| ${i + 1} | ${x.ko} | ${x.en} | \`${x.url}\` |`),
    END,
  ].join('\n')
}

// 문서의 표시 구간을 바꾼 결과
export function replaceBlock(doc: string, block: string): string {
  const a = doc.indexOf(START)
  const b = doc.indexOf(END)
  if (a < 0 || b < a) throw new Error('SUBMISSION.md에 console 표시 구간이 없음')
  return doc.slice(0, a) + block + doc.slice(b + END.length)
}

function main() {
  const f = readFields()
  const block = buildBlock(f)
  writeFileSync(DOC, replaceBlock(readFileSync(DOC, 'utf8'), block))
  for (const c of checkFields(f)) {
    const status = c.limit === null ? '미확인' : c.ok ? '통과' : '미통과'
    const shown = [...c.value].length > 24 ? `${[...c.value].slice(0, 24).join('')}…` : c.value
    console.log(`${status} ${c.field} ${c.count}/${c.limit ?? '미확인'} ${shown}${c.note ? ` (${c.note})` : ''}`)
  }
  const v = scanFields(f)
  console.log(`금칙어 위반 ${v.length}건`)
  if (v.length > 0) process.exitCode = 1
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(import.meta.filename)) main()
