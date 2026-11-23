// 기록 화면. 누적 금액, 연속 일수, 최근 7일 막대 그래프
import { OTHER_LABEL } from '../core/copy.ts'
import { formatNumber, formatWon } from '../core/format.ts'
import { streakDays, totalSaved, weeklySaved, type LogRecord } from '../core/stats.ts'
import items from '../data/items.json' with { type: 'json' }
import { spentLabel } from './types.ts'

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토']
// 막대 위 짧은 금액 표기. 1만 이상은 소수 첫째 자리 만 단위
const shortAmount = (n: number) => (n >= 10000 ? `${Number((n / 10000).toFixed(1))}만` : formatNumber(n))
const labelOf = (id: string) => items.find((i) => i.id === id)?.label ?? OTHER_LABEL
const categoryOf = (id: string) => items.find((i) => i.id === id)?.category ?? 'impulse'

function WeeklyChart({ data }: { data: { date: string; amount: number }[] }) {
  const w = 300
  const h = 150
  const top = 18
  const bottom = 22
  const max = Math.max(1, ...data.map((d) => d.amount))
  const slot = w / data.length
  const barW = slot * 0.56
  return (
    <svg className="chart" viewBox={`0 0 ${w} ${h}`} role="img" aria-label="최근 7일 참은 금액 막대 그래프">
      {data.map((d, i) => {
        const barH = d.amount > 0 ? Math.max(4, ((h - top - bottom) * d.amount) / max) : 4
        const x = i * slot + (slot - barW) / 2
        const y = h - bottom - barH
        const [yy, mm, dd] = d.date.split('-').map(Number)
        const wd = WEEKDAYS[new Date(yy, mm - 1, dd).getDay()]
        return (
          <g key={d.date}>
            <rect className={d.amount > 0 ? 'chart-bar' : 'chart-empty'} x={x} y={y} width={barW} height={barH} rx={4} />
            {d.amount > 0 && (
              <text className="chart-label" x={x + barW / 2} y={y - 4} textAnchor="middle">
                {shortAmount(d.amount)}
              </text>
            )}
            <text className="chart-label" x={x + barW / 2} y={h - 6} textAnchor="middle">{wd}</text>
          </g>
        )
      })}
    </svg>
  )
}

export function Log({ records, today }: { records: LogRecord[]; today: Date }) {
  const recent = [...records].reverse().slice(0, 10)
  return (
    <section className="screen" aria-labelledby="log-title">
      <h1 id="log-title" className="screen-title">기록</h1>
      <div className="stat-grid">
        <div className="card">
          <p className="section-label">누적 아낀 금액</p>
          <p className="stat-value" data-testid="total-saved">{formatWon(totalSaved(records))}</p>
        </div>
        <div className="card">
          <p className="section-label">연속 일수</p>
          <p className="stat-value" data-testid="streak">{streakDays(records, today)}일</p>
        </div>
      </div>
      <div className="card">
        <p className="section-label">최근 7일 참은 금액</p>
        <WeeklyChart data={weeklySaved(records, today)} />
      </div>
      <div className="card">
        <p className="section-label">최근 기록</p>
        {recent.length === 0 ? (
          <p className="meta">아직 기록이 없어요.</p>
        ) : (
          <ul className="record-list">
            {recent.map((r, i) => (
              <li key={`${r.date}-${i}`}>
                <span>{r.date.slice(5).replace('-', '/')} {labelOf(r.itemId)}</span>
                <span>{formatWon(r.amount)} · {r.choice === 'saved' ? '참았어요' : spentLabel(categoryOf(r.itemId))}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  )
}
