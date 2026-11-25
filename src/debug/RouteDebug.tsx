// 임시 경로 진단 패널. ?debug=1일 때만 App이 지연 로드한다. 검수 전 이 파일과 App의 RouteDebug 관련 줄을 지운다
// 진입 시(주소 교정 전) 값과 현재 값을 탭 바 위에 작게 보여 준다. 조작 요소 없음
import { useEffect, useState } from 'react'

type Loc = { href: string; pathname: string; hash: string; search: string }

const snapshot = (): Loc => ({ href: window.location.href, pathname: window.location.pathname, hash: window.location.hash, search: window.location.search })

export default function RouteDebug({ entry, entryScreen, screen }: { entry: Loc; entryScreen: string; screen: string }) {
  // 화면이 바뀔 때마다 현재 주소를 다시 읽는다
  const [now, setNow] = useState(snapshot)
  useEffect(() => {
    const t = window.setTimeout(() => setNow(snapshot()), 0)
    return () => window.clearTimeout(t)
  }, [screen])

  const rows: [string, string][] = [
    ['진입 href', entry.href],
    ['진입 pathname', entry.pathname],
    ['진입 hash', entry.hash || '(없음)'],
    ['진입 search', entry.search || '(없음)'],
    ['해석된 화면', entryScreen],
    ['현재 href', now.href],
    ['현재 화면', screen],
  ]
  return (
    <aside
      aria-label="경로 진단"
      data-testid="route-debug"
      style={{
        position: 'fixed',
        left: 8,
        right: 8,
        bottom: 'calc(var(--tabbar-h) + env(safe-area-inset-bottom, 0px) + 8px)',
        zIndex: 50,
        padding: '6px 8px',
        borderRadius: 8,
        background: 'rgba(0, 0, 0, 0.78)',
        color: '#ffffff',
        font: '11px/1.4 ui-monospace, monospace',
        wordBreak: 'break-all',
        pointerEvents: 'none',
      }}
    >
      {rows.map(([k, v]) => (
        <div key={k} data-key={k}>
          {k}: {v}
        </div>
      ))}
    </aside>
  )
}
