// 재물운 타로. 하루 한 장, 날짜 기반 시드. 환산 결과와 소비 기록에는 영향 없음
import { useEffect, useRef, useState } from 'react'
import { DISCLAIMER, TAROT_NOTICE } from '../core/copy.ts'
import { resolveToday, tarotCard } from '../core/tarot.ts'
import { TarotStage } from '../scenes/TarotStage.tsx'
import { store } from '../store/storage.ts'

// todayKey는 앱의 오늘 날짜 상태(useToday). 날짜가 바뀌면 새 카드로 다시 판정
export function Tarot({ todayKey, reduce3d }: { todayKey: string; reduce3d: boolean }) {
  const [stored, setStored] = useState(() => store.getTarot())
  const { cardId, drawn } = resolveToday(stored, todayKey)
  const card = tarotCard(cardId)
  const titleRef = useRef<HTMLHeadingElement>(null)
  const justDrew = useRef(false)

  // 뒤집은 직후 결과 제목으로 포커스 이동
  useEffect(() => {
    if (drawn && justDrew.current) {
      titleRef.current?.focus()
      justDrew.current = false
    }
  }, [drawn])

  function draw() {
    if (drawn) return
    justDrew.current = true
    store.saveTarot({ date: todayKey, cardId })
    setStored(store.getTarot())
  }

  return (
    <section className="screen" aria-labelledby="tarot-title">
      <h1 id="tarot-title" className="screen-title">오늘의 재물운 타로</h1>
      <p className="notice notice-other tarot-notice" data-testid="tarot-notice">{TAROT_NOTICE}</p>

      <TarotStage id={card.id} name={card.name} keyword={card.keyword} drawn={drawn} reduce3d={reduce3d} />

      <div className="card tarot-result" aria-live="polite">
        {drawn ? (
          <>
            <div>
              <h2 ref={titleRef} tabIndex={-1} className="tarot-name" data-testid="tarot-name">{card.name}</h2>
              <p className="meta">키워드 · <strong>{card.keyword}</strong></p>
            </div>
            <p className="quote tarot-advice">{card.adviceTemplate}</p>
            <p className="meta">오늘의 카드는 내일 바뀌어요.</p>
          </>
        ) : (
          <p className="meta">하루에 한 장, 오늘의 카드를 뒤집어 볼 수 있어요.</p>
        )}
      </div>

      {!drawn && (
        <button type="button" className="btn btn-primary btn-block" onClick={draw}>카드 뒤집기</button>
      )}

      <p className="disclaimer" data-testid="disclaimer">{DISCLAIMER}</p>
    </section>
  )
}
