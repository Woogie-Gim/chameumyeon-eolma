// 2D 폴백. CSS rotateY 전환으로 카드를 뒤집는다. 동작 줄이기 환경에서는 전환 없이 바로 바뀐다
import { starPoints, tarotPattern } from './tarotPattern.ts'

const W = 140
const H = 220

export function FrontFace({ id }: { id: number }) {
  const p = tarotPattern(id)
  return (
    <svg viewBox={`${-W / 2} ${-H / 2} ${W} ${H}`} className="tarot-face-svg">
      <rect className="tarot-front-bg" x={-W / 2} y={-H / 2} width={W} height={H} rx={10} />
      <rect className="tarot-ink-line" x={-W / 2 + 7} y={-H / 2 + 7} width={W - 14} height={H - 14} rx={6} />
      <circle className="tarot-ink" r={p.centerR * W} />
      {p.stars.map((s, i) => (
        <polygon
          key={i}
          className="tarot-star"
          // svg는 y축이 아래 방향이므로 뒤집는다
          points={starPoints(s.r * W).map(([x, y]) => `${s.x * W + x},${-(s.y * W + y)}`).join(' ')}
        />
      ))}
    </svg>
  )
}

export function BackFace() {
  return (
    <svg viewBox={`${-W / 2} ${-H / 2} ${W} ${H}`} className="tarot-face-svg">
      <rect className="tarot-back-bg" x={-W / 2} y={-H / 2} width={W} height={H} rx={10} />
      <rect className="tarot-ink-line" x={-W / 2 + 8} y={-H / 2 + 8} width={W - 16} height={H - 16} rx={6} />
      <rect className="tarot-edge" x={-27} y={-27} width={54} height={54} transform="rotate(45)" />
      <circle className="tarot-ink-line" r={22} strokeWidth={5} />
      <rect className="tarot-ink" x={-8} y={-76} width={16} height={16} transform="rotate(45 0 -68)" />
      <rect className="tarot-ink" x={-8} y={60} width={16} height={16} transform="rotate(45 0 68)" />
    </svg>
  )
}

export function TarotFallback2d({ id, drawn }: { id: number; drawn: boolean }) {
  return (
    <div className="tarot-flip" aria-hidden="true">
      <div className={drawn ? 'tarot-inner is-drawn' : 'tarot-inner'}>
        <div className="tarot-face tarot-face-back"><BackFace /></div>
        <div className="tarot-face tarot-face-front"><FrontFace id={id} /></div>
      </div>
    </div>
  )
}
