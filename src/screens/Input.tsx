// 입력 화면. 직접 입력 원문은 입력 칸에만 잠시 머물고 판정 후 비운다
import { useState, type FormEvent } from 'react'
import { parseAmountInput } from '../core/amount.ts'
import { AMOUNT_MESSAGES, PRIVACY_NOTE } from '../core/copy.ts'
import { formatNumber } from '../core/format.ts'
import { filterInput, type Category } from '../core/inputFilter.ts'
import { attachParticle } from '../core/template.ts'
import items from '../data/items.json' with { type: 'json' }
import { CATEGORY_LABELS, type Draft } from './types.ts'

type Picked = { itemId: string; label: string; category: Category }
type Notice = { kind: 'ok' | 'other' | 'error'; text: string } | null

const CHIPS_PER_CATEGORY = 8
const CATEGORIES = Object.keys(CATEGORY_LABELS) as Category[]

export function Input({ initial, onSubmit }: { initial: Draft | null; onSubmit: (d: Draft) => void }) {
  const [category, setCategory] = useState<Category | null>(initial?.category ?? null)
  const [picked, setPicked] = useState<Picked | null>(initial ? { itemId: initial.itemId, label: initial.label, category: initial.category } : null)
  const [text, setText] = useState('')
  const [notice, setNotice] = useState<Notice>(null)
  const [amount, setAmount] = useState<number>(initial?.amount ?? 0)
  const [amountNotice, setAmountNotice] = useState<string | null>(null)

  const chipItems = category ? items.filter((i) => i.category === category).slice(0, CHIPS_PER_CATEGORY) : []

  function pickCategory(c: Category) {
    setCategory(c)
    if (picked?.itemId === 'other') setPicked({ ...picked, category: c })
  }

  function pickItem(i: (typeof items)[number]) {
    setPicked({ itemId: i.id, label: i.label, category: i.category as Category })
    setNotice(null)
  }

  function submitText(e: FormEvent) {
    e.preventDefault()
    const r = filterInput(text)
    setText('') // 원문을 남기지 않는다
    if (r.status === 'allowed') {
      setPicked({ itemId: r.itemId, label: r.label, category: r.category })
      setCategory(r.category)
      setNotice({ kind: 'ok', text: `${attachParticle(r.label, '으로')} 인식했어요.` })
    } else if (r.status === 'other') {
      setPicked({ itemId: r.itemId, label: r.label, category: category ?? r.category })
      setNotice({ kind: 'other', text: '사전에 없는 품목이라 기타 소비로 기록해요.' })
    } else {
      setNotice({ kind: 'error', text: r.message })
    }
  }

  function changeAmount(v: string) {
    const r = parseAmountInput(v)
    setAmount(r.value)
    setAmountNotice(r.capped ? AMOUNT_MESSAGES.capped : r.negative ? AMOUNT_MESSAGES.negative : null)
  }

  const ready = picked !== null && amount >= 1

  return (
    <section className="screen screen-with-cta" aria-labelledby="input-title">
      <h1 id="input-title" className="screen-title">무엇을 참아 볼까요?</h1>

      <div className="card amount-card">
        <label className="section-label" htmlFor="amount">금액</label>
        <div className="amount-row">
          <input
            id="amount"
            className="amount-input"
            aria-label="금액"
            inputMode="numeric"
            autoComplete="off"
            placeholder="0"
            value={amount > 0 ? formatNumber(amount) : ''}
            onChange={(e) => changeAmount(e.target.value)}
          />
          <span className="amount-unit">원</span>
        </div>
        {amountNotice && (
          <p className="notice notice-other" role="status" data-testid="amount-notice">{amountNotice}</p>
        )}
        {picked && <p className="meta mt-2">선택한 품목: {picked.label}</p>}
      </div>

      <div className="card">
        <p className="section-label">어떤 마음인가요</p>
        <div className="chip-grid" role="group" aria-label="카테고리">
          {CATEGORIES.map((c) => (
            <button key={c} type="button" className="chip" aria-pressed={category === c} onClick={() => pickCategory(c)}>
              {CATEGORY_LABELS[c]}
            </button>
          ))}
        </div>
        {chipItems.length > 0 && (
          <>
            <p className="section-label mt-4">품목</p>
            <div className="chip-grid" role="group" aria-label="품목">
              {chipItems.map((i) => (
                <button key={i.id} type="button" className="chip" aria-pressed={picked?.itemId === i.id} onClick={() => pickItem(i)}>
                  {i.label}
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      <form className="card" onSubmit={submitText}>
        <label className="section-label" htmlFor="free-text">직접 입력 (치킨, 커피 같은 일반 명칭)</label>
        <div className="field-row">
          <input
            id="free-text"
            className="text-input"
            aria-label="품목 직접 입력"
            autoComplete="off"
            maxLength={30}
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
          <button type="submit" className="btn" disabled={text.trim() === ''}>확인</button>
        </div>
        <p className="meta mt-2">{PRIVACY_NOTE}</p>
        {notice && (
          <p className={`notice notice-${notice.kind}`} role={notice.kind === 'error' ? 'alert' : 'status'}>
            {notice.text}
          </p>
        )}
      </form>

      {/* 주요 버튼. 탭 바 위에 고정 */}
      <div className="cta-bar">
        <button
          type="button"
          className="btn btn-primary btn-block"
          disabled={!ready}
          onClick={() => picked && onSubmit({ ...picked, amount })}
        >
          환산하기
        </button>
      </div>
    </section>
  )
}
