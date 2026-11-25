// 하단 탭 아이콘. 인라인 SVG, 글자 없음, 보조 기기에서는 숨김(라벨이 이름 역할)
import type { ReactNode } from 'react'

export type TabIconName = 'input' | 'log' | 'tarot' | 'settings'

const PATHS: Record<TabIconName, ReactNode> = {
  // 연필
  input: (
    <>
      <path d="M4 20h4L19 9l-4-4L4 16v4z" />
      <path d="M13 7l4 4" />
    </>
  ),
  // 막대 그래프
  log: <path d="M5 20v-8M12 20V5M19 20v-5M3 20h18" />,
  // 카드
  tarot: (
    <>
      <rect x="6" y="3" width="12" height="18" rx="2" />
      <circle cx="12" cy="12" r="2.5" />
    </>
  ),
  // 조절 막대
  settings: (
    <>
      <path d="M4 7h9M17 7h3M4 17h3M11 17h9" />
      <circle cx="15" cy="7" r="2" />
      <circle cx="9" cy="17" r="2" />
    </>
  ),
}

export function TabIcon({ name }: { name: TabIconName }) {
  return (
    <svg className="tab-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      {PATHS[name]}
    </svg>
  )
}
