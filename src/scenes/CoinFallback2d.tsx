// 2D 폴백. 코인을 열로 쌓은 정적 그래픽. 아래부터 원금 코인, 그 위로 불어난 코인
import { COIN_MAX } from '../core/coinCount.ts'

const PER_COLUMN = 20

export function CoinFallback2d({ principal, grown }: { principal: number; grown: number }) {
  const coins = principal + grown
  const w = 300
  const h = 220
  const coinW = 44
  const coinH = 7
  const gap = 1.5
  const colGap = 16
  const shown = Math.min(coins, COIN_MAX)
  // 쓰는 열 수 기준 가운데 정렬
  const usedCols = Math.max(1, Math.ceil(shown / PER_COLUMN))
  const left = (w - usedCols * coinW - (usedCols - 1) * colGap) / 2
  const base = h - 34
  return (
    <svg className="coin-fallback" viewBox={`0 0 ${w} ${h}`} aria-hidden="true" preserveAspectRatio="xMidYMid meet">
      {Array.from({ length: shown }, (_, i) => {
        const col = Math.floor(i / PER_COLUMN)
        const level = i % PER_COLUMN
        return (
          <rect
            key={i}
            className={i < principal ? 'coin-principal' : 'coin-grown'}
            x={left + col * (coinW + colGap)}
            y={base - (level + 1) * (coinH + gap)}
            width={coinW}
            height={coinH}
            rx={3}
          />
        )
      })}
      <text className="label" x={w / 2} y={h - 10} textAnchor="middle">원금 {principal} · 불어난 {grown}</text>
    </svg>
  )
}
