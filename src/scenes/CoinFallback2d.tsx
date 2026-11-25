// 2D 폴백. 코인을 열로 쌓은 정적 그래픽. 아래부터 원금 코인, 그 위로 불어난 코인
// 3D와 같은 색 체계: 윗면 하이라이트, 바닥 그림자, 쌓임 직후 반짝임(동작 줄이기면 숨김)
import { COIN_MAX } from '../core/coinCount.ts'

const PER_COLUMN = 20
// 반짝임 위치. 맨 위 코인 중심 기준 상대 좌표와 크기
const SPARKLES: [number, number, number, number][] = [
  [0, -14, 6, 0],
  [-26, -6, 4, 120],
  [26, -10, 5, 220],
]

// 네 갈래 별 모양 경로
function sparklePath(cx: number, cy: number, r: number): string {
  const q = r * 0.3
  return `M${cx},${cy - r} L${cx + q},${cy - q} L${cx + r},${cy} L${cx + q},${cy + q} L${cx},${cy + r} L${cx - q},${cy + q} L${cx - r},${cy} L${cx - q},${cy - q} Z`
}

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
  const pos = (i: number) => ({ x: left + Math.floor(i / PER_COLUMN) * (coinW + colGap), y: base - ((i % PER_COLUMN) + 1) * (coinH + gap) })
  const top = shown > 0 ? pos(shown - 1) : null
  return (
    <svg className="coin-fallback" viewBox={`0 0 ${w} ${h}`} aria-hidden="true" preserveAspectRatio="xMidYMid meet">
      <ellipse className="floor-shadow" cx={w / 2} cy={base + 2} rx={(usedCols * coinW + (usedCols - 1) * colGap) / 2 + 18} ry={7} />
      {Array.from({ length: shown }, (_, i) => {
        const { x, y } = pos(i)
        return (
          <g key={i}>
            <rect className={i < principal ? 'coin-principal' : 'coin-grown'} x={x} y={y} width={coinW} height={coinH} rx={3} />
            <rect className="coin-hl" x={x + 4} y={y + 1.2} width={coinW - 8} height={1.6} rx={0.8} />
          </g>
        )
      })}
      {/* 개수가 바뀌면 key가 바뀌어 반짝임을 다시 재생 */}
      {top && grown > 0 && (
        <g key={`${principal}-${grown}`}>
          {SPARKLES.map(([dx, dy, r, delay]) => (
            <path key={delay} className="sparkle" style={{ animationDelay: `${delay}ms` }} d={sparklePath(top.x + coinW / 2 + dx, top.y + dy, r)} />
          ))}
        </g>
      )}
      <text className="label" x={w / 2} y={h - 10} textAnchor="middle">원금 {principal} · 불어난 {grown}</text>
    </svg>
  )
}
