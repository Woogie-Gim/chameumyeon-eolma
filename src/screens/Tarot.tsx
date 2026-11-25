// 재물운 타로. 화면에 들어올 때 22장 중 5장을 섞어 뒷면으로 펼치고, 한 장을 고르면 그날 하루 고정
// 환산 결과와 소비 기록에는 영향 없음
import { useEffect, useRef, useState } from 'react'
import { DISCLAIMER, TAROT_COPY, TAROT_NOTICE } from '../core/copy.ts'
import { drawSpread, resolveToday, tarotCard, type Random } from '../core/tarot.ts'
import { TarotSpreadStage } from '../scenes/TarotSpreadStage.tsx'
import { TarotStage } from '../scenes/TarotStage.tsx'
import { useSound } from '../sound/soundContext.ts'
import { store } from '../store/storage.ts'

type Spread = { key: string; ids: number[]; picked: number | null }

// todayKey는 앱의 오늘 날짜 상태(useToday). 날짜가 바뀌면 새로 펼친다
// random은 테스트에서 바꿔 끼울 수 있는 난수 함수
export function Tarot({ todayKey, reduce3d, random = Math.random }: { todayKey: string; reduce3d: boolean; random?: Random }) {
  const sound = useSound()
  const [stored, setStored] = useState(() => store.getTarot())
  const [spread, setSpread] = useState<Spread>(() => ({ key: todayKey, ids: drawSpread(random), picked: null }))
  const titleRef = useRef<HTMLHeadingElement>(null)
  const justPicked = useRef(false)

  // 자정이 지나 날짜가 바뀌면 새로 섞는다(렌더 중 상태 보정)
  if (spread.key !== todayKey) setSpread({ key: todayKey, ids: drawSpread(random), picked: null })

  const todayCard = resolveToday(stored, todayKey)
  const pickedHere = spread.key === todayKey && spread.picked !== null
  // 이번 방문에서 고르지 않았는데 오늘 기록이 있으면 펼침 없이 오늘 카드만 보여 준다
  const mode: 'spread' | 'already' = !pickedHere && todayCard !== null ? 'already' : 'spread'
  const cardId = pickedHere ? spread.ids[spread.picked as number] : todayCard
  const card = cardId !== null ? tarotCard(cardId) : null

  // 고른 직후 결과 제목으로 포커스 이동
  useEffect(() => {
    if (pickedHere && justPicked.current) {
      titleRef.current?.focus()
      justPicked.current = false
    }
  }, [pickedHere])

  function pick(i: number) {
    if (spread.picked !== null || todayCard !== null) return
    sound.play('flip')
    justPicked.current = true
    store.saveTarot({ date: todayKey, cardId: spread.ids[i] })
    setStored(store.getTarot())
    setSpread({ ...spread, picked: i })
  }

  return (
    <section className="screen" aria-labelledby="tarot-title">
      <h1 id="tarot-title" className="screen-title">오늘의 재물운 타로</h1>
      <p className="notice notice-other tarot-notice" data-testid="tarot-notice">{TAROT_NOTICE}</p>

      {mode === 'already' && card ? (
        <TarotStage id={card.id} name={card.name} keyword={card.keyword} drawn reduce3d={reduce3d} />
      ) : (
        <>
          <p id="tarot-guide" className="meta tarot-guide">{TAROT_COPY.pickGuide}</p>
          <span id="tarot-spread-label" className="sr-only">{TAROT_COPY.spreadLabel}</span>
          <TarotSpreadStage
            ids={spread.ids}
            picked={spread.picked}
            reduce3d={reduce3d}
            labelledBy="tarot-spread-label"
            describedBy="tarot-guide"
            onPick={pick}
          />
        </>
      )}

      {card && (
        <div className="card tarot-result" aria-live="polite">
          <div>
            <h2 ref={titleRef} tabIndex={-1} className="tarot-name" data-testid="tarot-name">{card.name}</h2>
            <p className="meta">키워드 · <strong>{card.keyword}</strong></p>
          </div>
          <p className="quote tarot-advice">{card.adviceTemplate}</p>
          <p className="meta" data-testid="tarot-tomorrow">{mode === 'already' ? TAROT_COPY.already : TAROT_COPY.picked}</p>
        </div>
      )}

      <p className="disclaimer" data-testid="disclaimer">{DISCLAIMER}</p>
    </section>
  )
}
