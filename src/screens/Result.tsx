// 결과 화면. 예금형은 이율, 적금형은 이율과 납입액, ETF형은 유형 상승률만 표시
import { useMemo, useState } from 'react'
import { coinSplit } from '../core/coinCount.ts'
import { ETF_MIN_YEARS, amountBand, futureValueCompound, installmentFutureValue, startYearRange, timeMachine } from '../core/calc.ts'
import { DISCLAIMER, ETF_DISCLAIMER } from '../core/copy.ts'
import { formatPercent, formatWon } from '../core/format.ts'
import { pickEtfMessage, pickMessage } from '../core/messagePick.ts'
import { fillTemplate } from '../core/template.ts'
import messages from '../data/messages.json' with { type: 'json' }
import messagesEtf from '../data/messagesEtf.json' with { type: 'json' }
import returns from '../data/returns.json' with { type: 'json' }
import { CoinStage } from '../scenes/CoinStage.tsx'
import { ScaleStage } from '../scenes/ScaleStage.tsx'
import type { Settings } from '../store/storage.ts'
import type { Draft } from './types.ts'

type Mode = 'deposit' | 'savings' | 'etf'
const MODE_TABS: { id: Mode; label: string }[] = [
  { id: 'deposit', label: '예금형' },
  { id: 'savings', label: '적금형' },
  { id: 'etf', label: 'ETF 타임머신형' },
]
type View = 'piggy' | 'scale'
const VIEW_TABS: { id: View; label: string }[] = [
  { id: 'piggy', label: '저금통' },
  { id: 'scale', label: '저울' },
]
const YEARS_MIN = 1
const YEARS_MAX = 10

export function Result({ draft, settings, onNext, onBack }: { draft: Draft; settings: Settings; onNext: () => void; onBack: () => void }) {
  const [mode, setMode] = useState<Mode>('deposit')
  const [years, setYears] = useState(5)
  const [assetId, setAssetId] = useState(returns.assetTypes[0].id)
  const [view, setView] = useState<View>('piggy')

  // 한마디는 입력이 바뀔 때만 새로 고른다
  const message = useMemo(() => pickMessage(messages, draft.category, amountBand(draft.amount)), [draft])
  const etfMessage = useMemo(() => pickEtfMessage(messagesEtf, draft.category), [draft])

  const amountText = formatWon(draft.amount)
  const deposit = futureValueCompound(draft.amount, settings.depositRate / 100, years)
  const savings = installmentFutureValue(draft.amount, settings.savingsRate / 100, years)
  const asset = returns.assetTypes.find((a) => a.id === assetId) ?? returns.assetTypes[0]
  // ETF형 기간: 최소 2년(시작 연도는 마지막 연도 직전까지), 최대는 데이터 첫 연도까지
  const range = startYearRange(asset.id)
  const etfMax = Math.min(YEARS_MAX, range.endYear - range.min + 1)
  const etfYears = Math.min(etfMax, Math.max(ETF_MIN_YEARS, years))
  const startYear = range.endYear - etfYears + 1
  const tm = timeMachine(draft.amount, asset.id, startYear)
  const shownYears = mode === 'etf' ? etfYears : years

  // ETF형은 과거 시제 전용 풀 사용
  const quote =
    mode === 'etf'
      ? fillTemplate(etfMessage.template, { item: draft.label, amount: amountText, startYear, future: formatWon(tm.value) })
      : fillTemplate(message.template, {
          item: draft.label,
          amount: amountText,
          years,
          future: formatWon(mode === 'savings' ? savings.value : deposit),
        })

  // 모드별 비교 쌍. 적금형은 총 납입액 기준. 코인 수와 저울 기울기에 함께 쓴다
  const pair =
    mode === 'deposit'
      ? { base: draft.amount, value: deposit, baseLabel: '지금 쓰는 금액' }
      : mode === 'savings'
        ? { base: savings.totalPaid, value: savings.value, baseLabel: '총 납입액' }
        : { base: draft.amount, value: tm.value, baseLabel: '지금 쓰는 금액' }
  const coins = coinSplit(pair.base, pair.value)

  return (
    <section className="screen" aria-labelledby="result-title">
      <h1 id="result-title" className="screen-title">{draft.label} {amountText}, 참으면 얼마?</h1>

      <div className="segmented" role="tablist" aria-label="환산 방식">
        {MODE_TABS.map((m) => (
          <button key={m.id} type="button" role="tab" className="tab" aria-selected={mode === m.id} onClick={() => setMode(m.id)}>
            {m.label}
          </button>
        ))}
      </div>

      {/* 핵심 문장: 몇 년 뒤 얼마 */}
      <div className="card hero-card">
        <div aria-live="polite">
          {mode === 'deposit' && (
            <>
              <p className="hero-lead">{amountText}을 한 번 넣었다면 {years}년 뒤 약</p>
              <p className="big-number" data-testid="result-value">{formatWon(deposit)}</p>
            </>
          )}
          {mode === 'savings' && (
            <>
              <p className="hero-lead">매달 {amountText}씩 {years}년 넣었다면 약</p>
              <p className="big-number" data-testid="result-value">{formatWon(savings.value)}</p>
            </>
          )}
          {mode === 'etf' && (
            <>
              <p className="hero-lead">{startYear}년 초에 {amountText}을 넣었다면 {tm.endYear}년 말 약</p>
              <p className="big-number" data-testid="result-value">{formatWon(tm.value)}</p>
            </>
          )}
        </div>
        <div className="hero-slider">
          <div className="slider-head">
            <label className="section-label" htmlFor="years">{mode === 'etf' ? '몇 년 전에 넣었다면' : '몇 년 뒤'}</label>
            <strong>{shownYears}년</strong>
          </div>
          <input
            id="years"
            className="slider"
            type="range"
            min={mode === 'etf' ? ETF_MIN_YEARS : YEARS_MIN}
            max={mode === 'etf' ? etfMax : YEARS_MAX}
            step={1}
            value={shownYears}
            onChange={(e) => setYears(Number(e.target.value))}
          />
        </div>
      </div>

      {/* 3D 연출은 카드 안 고정 높이 영역 */}
      <div className="card stage-card">
        <div className="view-toggle" role="group" aria-label="연출 선택">
          {VIEW_TABS.map((v) => (
            <button key={v.id} type="button" className="chip" aria-pressed={view === v.id} onClick={() => setView(v.id)}>
              {v.label}
            </button>
          ))}
        </div>
        {view === 'piggy' ? (
          <CoinStage split={coins} reduce3d={settings.reduce3d} />
        ) : (
          <ScaleStage spend={pair.base} converted={pair.value} spendLabel={pair.baseLabel} reduce3d={settings.reduce3d} />
        )}
      </div>

      {/* 수치 요약 */}
      <div className="card summary-card" aria-live="polite">
        {mode === 'deposit' && (
          <p className="rate-line">적용 이율 연 <strong>{settings.depositRate.toFixed(2)}%</strong></p>
        )}
        {mode === 'savings' && (
          <>
            <p className="rate-line">적용 이율 연 <strong>{settings.savingsRate.toFixed(2)}%</strong></p>
            <p className="meta">총 납입액 {formatWon(savings.totalPaid)}</p>
          </>
        )}
        {mode === 'etf' && (
          <>
            <div className="chips" role="group" aria-label="ETF 유형">
              {returns.assetTypes.map((a) => (
                <button key={a.id} type="button" className="chip" aria-pressed={asset.id === a.id} onClick={() => setAssetId(a.id)}>
                  {a.label}
                </button>
              ))}
            </div>
            <p className="rate-line">
              {asset.label} {startYear}~{tm.endYear} 상승률 <strong>{formatPercent(tm.cumulativeReturn)}</strong>
              {asset.isSample && <> <span className="badge">샘플 데이터</span></>}
            </p>
            <p className="disclaimer" data-testid="etf-disclaimer">{ETF_DISCLAIMER}</p>
          </>
        )}
      </div>

      <div className="card">
        <p className="section-label">한마디</p>
        <p className="quote">{quote}</p>
      </div>

      <p className="disclaimer" data-testid="disclaimer">{DISCLAIMER}</p>

      <button type="button" className="btn btn-primary btn-block" onClick={onNext}>다음</button>
      <button type="button" className="btn btn-block" onClick={onBack}>다시 입력</button>
    </section>
  )
}
