// 3D 모듈을 받는 동안 보여 줄 대체 화면. 2D 그래픽 위에 준비 중 표시
// 정보는 바깥 영역의 대체 텍스트에 있으므로 표시는 보조 기기에서 숨김
import type { ReactNode } from 'react'

export function SceneLoading({ children }: { children: ReactNode }) {
  return (
    <div className="scene-loading" data-testid="scene-loading">
      {children}
      <span className="scene-loading-badge" aria-hidden="true">3D 준비 중</span>
    </div>
  )
}
