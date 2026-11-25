// 2D 폴백. 지금 쓰는 금액과 환산 금액을 막대 두 개로 비교. 큰 값 기준으로 높이 정규화
export function ScaleFallback2d({ spend, converted, spendLabel }: { spend: number; converted: number; spendLabel: string }) {
  const w = 300
  const h = 220
  const barW = 64
  const base = h - 40
  const maxH = base - 24
  const max = Math.max(spend, converted, 1)
  const bars = [
    { key: 'spend', cls: 'scale-bar scale-bar-spend', x: w / 2 - barW - 24, v: spend, label: spendLabel },
    { key: 'converted', cls: 'scale-bar scale-bar-converted', x: w / 2 + 24, v: converted, label: '환산 금액' },
  ]
  return (
    <svg className="scale-fallback" viewBox={`0 0 ${w} ${h}`} aria-hidden="true" preserveAspectRatio="xMidYMid meet">
      <ellipse className="floor-shadow" cx={w / 2} cy={base + 3} rx={w / 2 - 30} ry={6} />
      <line className="scale-axis" x1={24} x2={w - 24} y1={base} y2={base} />
      {bars.map((b) => {
        const bh = Math.max(2, (Math.max(0, b.v) / max) * maxH)
        return (
          <g key={b.key}>
            <rect className={b.cls} x={b.x} y={base - bh} width={barW} height={bh} rx={4} />
            <text className="label" x={b.x + barW / 2} y={h - 14} textAnchor="middle">{b.label}</text>
          </g>
        )
      })}
    </svg>
  )
}
