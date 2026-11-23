// Phase 0 데이터 수집. 이율(rates.json)과 ETF 유형 연간 상승률(returns.json) 생성
// 출처 식별자(지수 기호, 통계 코드)는 이 스크립트와 docs/DATA_SOURCES.md에만 둔다
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'

const ROOT = resolve(import.meta.dirname, '..')
const RATES_PATH = resolve(ROOT, 'src/data/rates.json')
const RETURNS_PATH = resolve(ROOT, 'src/data/returns.json')
const TODO_PATH = resolve(ROOT, 'docs/DATA_TODO.md')
const UA = 'chameumyeon-eolma-data-script/0.1'

const START_YEAR = 2000
const TOLERANCE_PP = 1 // 교차 검증 허용 차이(%p)

// .env 간이 로더. 키가 없으면 공개 샘플 키 사용
function loadEnv(): Record<string, string> {
  const p = resolve(ROOT, '.env')
  if (!existsSync(p)) return {}
  const out: Record<string, string> = {}
  for (const line of readFileSync(p, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)
    if (m && m[2]) out[m[1]] = m[2]
  }
  return out
}
const env = { ...loadEnv(), ...process.env }
const ECOS_KEY = env.ECOS_API_KEY || 'sample'

async function getJson(url: string): Promise<any> {
  const res = await fetch(url, { headers: { 'User-Agent': UA } })
  if (!res.ok) throw new Error(`HTTP ${res.status} ${url}`)
  return res.json()
}
async function getText(url: string): Promise<string> {
  const res = await fetch(url, { headers: { 'User-Agent': UA } })
  if (!res.ok) throw new Error(`HTTP ${res.status} ${url}`)
  return res.text()
}

const round = (n: number, d: number) => Math.round(n * 10 ** d) / 10 ** d
const median = (xs: number[]) => {
  const s = [...xs].sort((a, b) => a - b)
  const m = Math.floor(s.length / 2)
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2
}

type Todo = { area: string; item: string; reason: string }
const todos: Todo[] = []

// ---------- 이율 ----------

// 통계 121Y002: 예금은행 수신금리(신규취급액 기준, 연리%)
const ECOS_STAT = '121Y002'
const RATE_ITEMS = {
  deposit: {
    main: 'BEABAA211',
    buckets: ['BEABAA2111', 'BEABAA2112', 'BEABAA2113', 'BEABAA2114', 'BEABAA2115', 'BEABAA2116', 'BEABAA2117'],
  },
  savings: {
    main: 'BEABAA212',
    buckets: ['BEABAA2121', 'BEABAA2122'],
  },
} as const

type Row = { TIME: string; DATA_VALUE: string }

// 샘플 키는 요청당 10행 제한이라 10행씩 나눠 받는다
async function ecosSeries(cycle: 'M' | 'Q', from: string, to: string, item: string): Promise<Row[]> {
  const rows: Row[] = []
  for (let start = 1; ; start += 10) {
    const url = `https://ecos.bok.or.kr/api/StatisticSearch/${ECOS_KEY}/json/kr/${start}/${start + 9}/${ECOS_STAT}/${cycle}/${from}/${to}/${item}`
    const j = await getJson(url)
    const body = j.StatisticSearch
    if (!body) {
      if (j.RESULT?.CODE === 'INFO-200') break // 데이터 없음
      throw new Error(`ECOS 응답 오류: ${JSON.stringify(j.RESULT ?? j)}`)
    }
    rows.push(...body.row)
    if (start + 9 >= body.list_total_count) break
  }
  return rows
}

const num = (v: string) => (v === '' || v == null || Number.isNaN(Number(v)) ? null : Number(v))

function ym(d: Date) {
  return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}`
}

async function collectRates() {
  const now = new Date()
  const from = ym(new Date(now.getFullYear(), now.getMonth() - 15, 1))
  const to = ym(now)
  const out: Record<string, { min: number; default: number; max: number }> = {}
  const detail: Record<string, unknown> = {}
  let asOf = ''
  let isSample = false

  for (const [key, cfg] of Object.entries(RATE_ITEMS)) {
    const monthly = (await ecosSeries('M', from, to, cfg.main))
      .map((r) => ({ t: r.TIME, v: num(r.DATA_VALUE) }))
      .filter((r): r is { t: string; v: number } => r.v != null)
      .sort((a, b) => a.t.localeCompare(b.t))
      .slice(-12)
    if (monthly.length < 12) throw new Error(`${key}: 월별 값 ${monthly.length}개뿐`)
    const latest = monthly[monthly.length - 1].t

    // 최신월 만기 구간별 값
    const bucketVals: number[] = []
    for (const b of cfg.buckets) {
      const r = (await ecosSeries('M', latest, latest, b))[0]
      const v = r ? num(r.DATA_VALUE) : null
      if (v != null) bucketVals.push(v)
    }

    const series = monthly.map((m) => m.v)
    const all = [...series, ...bucketVals]
    out[key] = {
      min: round(Math.min(...all), 2),
      default: round(median(series), 2),
      max: round(Math.max(...all), 2),
    }

    // 교차 검증: 최신 완결 분기 평균(Q)과 해당 월 평균 비교
    const qRows = (await ecosSeries('Q', `${Number(latest.slice(0, 4)) - 1}Q1`, `${latest.slice(0, 4)}Q4`, cfg.main))
      .map((r) => ({ t: r.TIME, v: num(r.DATA_VALUE) }))
      .filter((r): r is { t: string; v: number } => r.v != null)
    const lastQ = qRows[qRows.length - 1]
    let qCheck: unknown = null
    if (lastQ) {
      const y = lastQ.t.slice(0, 4)
      const q = Number(lastQ.t.slice(-1))
      const months = [1, 2, 3].map((i) => `${y}${String((q - 1) * 3 + i).padStart(2, '0')}`)
      const mv = monthly.filter((m) => months.includes(m.t)).map((m) => m.v)
      if (mv.length === 3) {
        const avg = mv.reduce((a, b) => a + b, 0) / 3
        const diff = Math.abs(avg - lastQ.v)
        qCheck = { quarter: lastQ.t, quarterly: lastQ.v, monthlyAvg: round(avg, 3), diffPp: round(diff, 3) }
        if (diff >= TOLERANCE_PP) {
          isSample = true
          todos.push({ area: '이율', item: key, reason: `분기값 ${lastQ.v}와 월평균 ${round(avg, 2)} 차이 ${round(diff, 2)}%p` })
        }
      }
    }
    if (!qCheck) todos.push({ area: '이율', item: key, reason: '분기 교차 검증 불가(해당 월 데이터 부족)' })

    detail[key] = { monthly, latestBuckets: bucketVals, qCheck }
    asOf = latest > asOf ? latest : asOf
  }

  const rates = {
    deposit: out.deposit,
    savings: out.savings,
    asOf: `${asOf.slice(0, 4)}-${asOf.slice(4)}`,
    isSample,
  }
  return { rates, detail }
}

// ---------- ETF 유형 수익률 ----------

// 유형과 대응 지수. 외부에 노출하지 않는다
const ASSET_TYPES = [
  { id: 'tech', label: '기술주 ETF형', symbol: '^NDX', wiki: 'Nasdaq-100', wikiPctCol: 3 },
  { id: 'largecap', label: '대형주 ETF형', symbol: '^GSPC', wiki: 'S&P_500', wikiPctCol: 1 },
] as const

// 1차: 월봉 12월 종가로 연간 상승률(%) 계산
async function yahooAnnual(symbol: string): Promise<Map<number, number>> {
  // range=max는 3개월봉으로 바뀌므로 기간을 직접 지정
  const p1 = Date.UTC(START_YEAR - 2, 0, 1) / 1000
  const p2 = Math.floor(Date.now() / 1000)
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?period1=${p1}&period2=${p2}&interval=1mo`
  const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } })
  if (!res.ok) throw new Error(`HTTP ${res.status} ${url}`)
  const j: any = await res.json()
  const r = j.chart?.result?.[0]
  if (!r) throw new Error(`차트 응답 없음: ${symbol}`)
  const ts: number[] = r.timestamp
  const close: (number | null)[] = r.indicators.quote[0].close
  const decClose = new Map<number, number>()
  ts.forEach((t, i) => {
    const d = new Date(t * 1000 + 12 * 3600 * 1000) // 시간대 보정
    if (d.getUTCMonth() === 11 && close[i] != null) decClose.set(d.getUTCFullYear(), close[i] as number)
  })
  const out = new Map<number, number>()
  for (const [y, c] of decClose) {
    const prev = decClose.get(y - 1)
    if (prev) out.set(y, (c / prev - 1) * 100)
  }
  return out
}

// 2차: 위키 표에서 연도와 가격 상승률(%) 추출
async function wikiAnnual(page: string, pctCol: number): Promise<Map<number, number>> {
  const raw = await getText(`https://en.wikipedia.org/w/index.php?title=${encodeURIComponent(page)}&action=raw`)
  const out = new Map<number, number>()
  for (const block of raw.split(/\n\|-/)) {
    const cells = block
      .replace(/^\s*\n/, '')
      .split(/\n\||\|\|/)
      .map((c) => c.replace(/^\|/, '').replace(/^[^|]*style="[^"]*"\s*\|/, '').trim())
    const year = Number(cells[0])
    if (!Number.isInteger(year) || year < 1900 || year > 2100) continue
    const cell = cells[pctCol]
    if (!cell) continue
    const v = Number(cell.replace(/−/g, '-').replace(/[%,\s]/g, ''))
    if (cell.trim() !== '' && !Number.isNaN(v)) out.set(year, v)
  }
  return out
}

async function collectReturns() {
  const lastYear = new Date().getFullYear() - 1 // 마지막 완결 연도
  const assetTypes = []
  const detail: Record<string, unknown> = {}
  for (const a of ASSET_TYPES) {
    const [primary, secondary] = await Promise.all([
      yahooAnnual(a.symbol),
      wikiAnnual(a.wiki, a.wikiPctCol).catch((e) => {
        console.warn(`2차 출처 실패(${a.id}): ${e.message}`)
        return new Map<number, number>()
      }),
    ])
    const annualReturns: Record<string, number | null> = {}
    const sampleYears: number[] = []
    const diffs: { year: number; primary: number | null; secondary: number | null; diffPp: number | null }[] = []
    for (let y = START_YEAR; y <= lastYear; y++) {
      const p = primary.get(y)
      const s = secondary.get(y)
      annualReturns[String(y)] = p == null ? null : round(p / 100, 4)
      const diff = p != null && s != null ? Math.abs(p - s) : null
      diffs.push({ year: y, primary: p == null ? null : round(p, 2), secondary: s ?? null, diffPp: diff == null ? null : round(diff, 2) })
      if (p == null || s == null || diff! >= TOLERANCE_PP) {
        sampleYears.push(y)
        const reason =
          p == null ? '1차 출처 값 없음' : s == null ? '2차 출처 값 없음' : `1차 ${round(p, 2)}% vs 2차 ${s}% 차이 ${round(diff!, 2)}%p`
        todos.push({ area: '수익률', item: `${a.label} ${y}`, reason })
      }
    }
    assetTypes.push({
      id: a.id,
      label: a.label,
      annualReturns,
      isSample: sampleYears.length > 0,
      sampleYears,
      source: '공개 지수 통계',
    })
    detail[a.id] = diffs
  }
  return { returns: { asOf: `${lastYear}-12-31`, assetTypes }, detail }
}

// ---------- 실행 ----------

function writeJson(path: string, data: unknown) {
  mkdirSync(dirname(path), { recursive: true })
  writeFileSync(path, JSON.stringify(data, null, 2) + '\n')
}

function writeTodo(collectedAt: string) {
  const lines = [
    '# 데이터 TODO',
    '',
    `\`npm run fetch:data\`가 생성한다. 수집일: ${collectedAt}`,
    '',
    '값을 찾지 못했거나 두 출처가 1%p 이상 다른 항목이다. 해당 항목은 isSample true로 남아 있다.',
    '',
  ]
  if (todos.length === 0) lines.push('없음.')
  else {
    lines.push('| 구분 | 항목 | 사유 |', '| --- | --- | --- |')
    for (const t of todos) lines.push(`| ${t.area} | ${t.item} | ${t.reason} |`)
  }
  writeFileSync(TODO_PATH, lines.join('\n') + '\n')
}

async function main() {
  const collectedAt = new Date().toISOString().slice(0, 10)
  let ok = 0

  try {
    const { rates, detail } = await collectRates()
    writeJson(RATES_PATH, rates)
    console.log('이율', JSON.stringify(rates))
    console.log('이율 상세', JSON.stringify(detail))
    ok++
  } catch (e) {
    console.error(`이율 수집 실패, 기존 파일 유지: ${(e as Error).message}`)
  }

  try {
    const { returns, detail } = await collectReturns()
    writeJson(RETURNS_PATH, returns)
    for (const [id, rows] of Object.entries(detail)) {
      console.log(`수익률 ${id}`)
      console.table(rows)
    }
    ok++
  } catch (e) {
    console.error(`수익률 수집 실패, 기존 파일 유지: ${(e as Error).message}`)
  }

  writeTodo(collectedAt)
  if (ok < 2) process.exit(1)
}

main()
