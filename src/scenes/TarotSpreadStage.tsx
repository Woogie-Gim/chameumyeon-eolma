// 타로 펼침 무대. 입력은 3D와 2D 공통 DOM 버튼 레이어가 받는다(키보드, 보조 기기, 터치 영역 보장)
// 3D 가능하면 버튼 아래 캔버스가 카드를 그리고 버튼은 투명, 아니면 버튼 안에 2D 카드를 그린다
import { Suspense, lazy, useLayoutEffect, useRef, useState, type KeyboardEvent, type RefObject } from 'react'
import { SPREAD_CARD_H, SPREAD_CARD_W, spreadLayout, tarotCard } from '../core/tarot.ts'
import { SceneBoundary } from './SceneBoundary.tsx'
import { SceneLoading } from './SceneLoading.tsx'
import { BackFace, FrontFace } from './TarotFallback2d.tsx'
import { liftOf } from './spreadMotion.ts'
import { useUse3d } from './useUse3d.ts'

const TarotSpread3d = lazy(() => import('./TarotSpread3d.tsx'))

const DEFAULT_WIDTH = 350

// 요소 폭 추적. ResizeObserver가 없으면 창 크기 변경으로 대신한다
function useWidth(ref: RefObject<HTMLElement | null>): number {
  const [width, setWidth] = useState(DEFAULT_WIDTH)
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const measure = () => setWidth(el.clientWidth || DEFAULT_WIDTH)
    measure()
    if (typeof ResizeObserver !== 'undefined') {
      const ro = new ResizeObserver(measure)
      ro.observe(el)
      return () => ro.disconnect()
    }
    window.addEventListener('resize', measure)
    return () => window.removeEventListener('resize', measure)
  }, [ref])
  return width
}

type Props = {
  ids: number[]
  picked: number | null
  reduce3d: boolean
  labelledBy: string
  describedBy: string
  onPick: (index: number) => void
}

export function TarotSpreadStage({ ids, picked, reduce3d, labelledBy, describedBy, onPick }: Props) {
  const { use3d, onFail } = useUse3d(reduce3d)
  const [ready3d, setReady3d] = useState(false)
  const stageRef = useRef<HTMLDivElement>(null)
  const width = useWidth(stageRef)
  const slots = spreadLayout(ids.length, width)
  const buttons = useRef<(HTMLButtonElement | null)[]>([])
  const [focusIndex, setFocusIndex] = useState(Math.floor(ids.length / 2))
  const [hover, setHover] = useState<number | null>(null)
  const [focused, setFocused] = useState<number | null>(null)
  const active = hover ?? focused
  // 3D가 준비되기 전(로딩 중)이나 2D 환경에서는 버튼 안에 카드를 그린다
  const draw2d = !use3d || !ready3d

  function move(from: number, delta: number) {
    const next = (from + delta + ids.length) % ids.length
    setFocusIndex(next)
    buttons.current[next]?.focus()
  }

  function onKeyDown(e: KeyboardEvent<HTMLButtonElement>, i: number) {
    if (picked !== null) return
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') move(i, 1)
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') move(i, -1)
    else if (e.key === 'Home') move(0, 0)
    else if (e.key === 'End') move(ids.length - 1, 0)
    else return
    e.preventDefault()
  }

  function label(i: number): string {
    if (picked === null) return `${i + 1}번째 카드 뒷면, 눌러서 뒤집기`
    if (picked === i) {
      const c = tarotCard(ids[i])
      return `고른 카드: ${c.name}, 키워드 ${c.keyword}`
    }
    return `${i + 1}번째 카드, 고르지 않음`
  }

  return (
    <div ref={stageRef} className="tarot-stage tarot-spread" data-testid={use3d ? 'tarot-stage-3d' : 'tarot-stage-2d'}>
      {use3d && (
        <div className="spread-canvas" aria-hidden="true">
          <SceneBoundary fallback={null} onError={onFail}>
            <Suspense fallback={<SceneLoading>{null}</SceneLoading>}>
              <TarotSpread3d ids={ids} slots={slots} picked={picked} active={active} onLost={onFail} onReady={() => setReady3d(true)} />
            </Suspense>
          </SceneBoundary>
        </div>
      )}
      <div className="spread-cards" role="group" aria-labelledby={labelledBy} aria-describedby={describedBy}>
        {ids.map((id, i) => {
          const s = slots[i]
          const lift = liftOf(i, picked, active)
          const dimmed = picked !== null && picked !== i
          return (
            <button
              key={`${id}-${i}`}
              ref={(el) => {
                buttons.current[i] = el
              }}
              type="button"
              className={draw2d ? 'spread-card' : 'spread-card is-ghost'}
              data-sound="custom"
              data-testid="spread-card"
              data-state={picked === i ? 'picked' : dimmed ? 'dimmed' : 'idle'}
              aria-label={label(i)}
              aria-disabled={picked !== null ? true : undefined}
              tabIndex={picked === null && i === focusIndex ? 0 : -1}
              style={{
                width: SPREAD_CARD_W,
                height: SPREAD_CARD_H,
                zIndex: picked === i ? ids.length + 1 : i + 1,
                transform: `translate(-50%, -50%) translate(${s.x}px, ${s.y - lift}px) rotate(${s.rot}deg)`,
              }}
              onClick={() => picked === null && onPick(i)}
              onKeyDown={(e) => onKeyDown(e, i)}
              onPointerEnter={() => setHover(i)}
              onPointerLeave={() => setHover((h) => (h === i ? null : h))}
              onFocus={() => {
                setFocused(i)
                setFocusIndex(i)
              }}
              onBlur={() => setFocused((f) => (f === i ? null : f))}
            >
              {draw2d && (
                <span className={picked === i ? 'tarot-inner is-drawn' : 'tarot-inner'} aria-hidden="true">
                  <span className="tarot-face tarot-face-back"><BackFace /></span>
                  <span className="tarot-face tarot-face-front"><FrontFace id={id} /></span>
                </span>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
