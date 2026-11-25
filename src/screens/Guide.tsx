// 이용 안내. 정적 화면, 문구는 copy.ts에서 관리
import { DISCLAIMER, PRIVACY_DETAIL, PRIVACY_NOTE, guideSections } from '../core/copy.ts'
import rates from '../data/rates.json' with { type: 'json' }
import returns from '../data/returns.json' with { type: 'json' }

const SECTIONS = guideSections({ rates: rates.asOf, returns: returns.asOf })

export function Guide({ onBack }: { onBack: () => void }) {
  return (
    <section className="screen" aria-labelledby="guide-title">
      <h1 id="guide-title" className="screen-title">이용 안내</h1>

      {/* 고정 안내: 면책과 개인정보 */}
      <div className="card guide-notice" data-testid="guide-notice">
        <p className="guide-text"><strong>{DISCLAIMER}</strong></p>
        <p className="guide-text">{PRIVACY_NOTE} {PRIVACY_DETAIL}</p>
      </div>

      {SECTIONS.map((s) => (
        <article key={s.id} className="card guide-section" aria-labelledby={`guide-${s.id}`}>
          <h2 id={`guide-${s.id}`} className="guide-heading">{s.title}</h2>
          {s.paragraphs.map((p) => (
            <p key={p} className="guide-text">{p}</p>
          ))}
        </article>
      ))}

      <p className="disclaimer" data-testid="disclaimer">{DISCLAIMER}</p>
      <button type="button" className="btn btn-block" onClick={onBack}>돌아가기</button>
    </section>
  )
}
