// 3D 사용 여부 훅. WebGL 미지원, 저사양 토글, 동작 줄이기 중 하나라도 해당하면 2D
// onFail은 3D 로딩, 렌더 실패나 WebGL 컨텍스트 소실 때 불러 2D로 전환
import { useEffect, useState } from 'react'
import { detectWebgl, prefersReducedMotion, shouldUse3d } from '../core/fallback.ts'

let webglCache: boolean | null = null
function hasWebgl(): boolean {
  if (webglCache === null) webglCache = detectWebgl(() => document.createElement('canvas'))
  return webglCache
}

const motionQuery = () =>
  prefersReducedMotion(typeof window !== 'undefined' && window.matchMedia ? (q) => window.matchMedia(q) : undefined)

export function useUse3d(reduce3d: boolean): { use3d: boolean; onFail: () => void } {
  const [reducedMotion, setReducedMotion] = useState(motionQuery)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    const onChange = () => setReducedMotion(mq.matches)
    mq.addEventListener?.('change', onChange)
    return () => mq.removeEventListener?.('change', onChange)
  }, [])

  return {
    use3d: !failed && shouldUse3d({ webgl: hasWebgl(), reduce3d, reducedMotion }),
    onFail: () => setFailed(true),
  }
}
