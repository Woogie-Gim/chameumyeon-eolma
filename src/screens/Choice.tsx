// 선택 화면. 고른 결과를 기록한다
import { formatWon } from '../core/format.ts'
import type { Choice as ChoiceValue } from '../core/stats.ts'
import type { Draft } from './types.ts'

export function Choice({ draft, onChoose }: { draft: Draft; onChoose: (c: ChoiceValue) => void }) {
  return (
    <section className="screen" aria-labelledby="choice-title">
      <h1 id="choice-title" className="screen-title">이번 {draft.label}, 어떻게 됐나요?</h1>
      <p className="meta">{formatWon(draft.amount)} · 고른 결과는 기록에 남아요.</p>
      <div className="choice-grid">
        <button type="button" className="btn btn-primary choice-btn" onClick={() => onChoose('saved')}>참았어요</button>
        <button type="button" className="btn choice-btn" onClick={() => onChoose('spent')}>먹었어요</button>
      </div>
      <p className="meta">먹었어요는 사용한 경우를 모두 포함해요.</p>
    </section>
  )
}
