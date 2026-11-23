// 3D와 2D 폴백 선택. 3D 모듈은 동적 import로 분리
import { Component, Suspense, lazy, useEffect, useState, type ReactNode } from 'react'
import { detectWebgl, prefersReducedMotion, shouldUse3d } from '../core/fallback.ts'
import { CoinFallback2d } from './CoinFallback2d.tsx'

const PiggyBank = lazy(() => import('./PiggyBank.tsx'))

let webglCache: boolean | null = null
function hasWebgl(): boolean {
  if (webglCache === null) webglCache = detectWebgl(() => document.createElement('canvas'))
  return webglCache
}

const motionQuery = () =>
  prefersReducedMotion(typeof window !== 'undefined' && window.matchMedia ? (q) => window.matchMedia(q) : undefined)

// 3D 실패 시 2D로 전환
class SceneBoundary extends Component<{ fallback: ReactNode; onError: () => void; children: ReactNode }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() {
    return { failed: true }
  }
  componentDidCatch() {
    this.props.onError()
  }
  render() {
    return this.state.failed ? this.props.fallback : this.props.children
  }
}

export function CoinStage({ coins, reduce3d }: { coins: number; reduce3d: boolean }) {
  const [reducedMotion, setReducedMotion] = useState(motionQuery)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    const onChange = () => setReducedMotion(mq.matches)
    mq.addEventListener?.('change', onChange)
    return () => mq.removeEventListener?.('change', onChange)
  }, [])

  const use3d = !failed && shouldUse3d({ webgl: hasWebgl(), reduce3d, reducedMotion })
  const fallback = <CoinFallback2d coins={coins} />

  return (
    <div className="coin-stage" role="img" aria-label={`코인 ${coins}개 쌓임`} data-testid={use3d ? 'coin-stage-3d' : 'coin-stage-2d'}>
      {use3d ? (
        <SceneBoundary fallback={fallback} onError={() => setFailed(true)}>
          <Suspense fallback={fallback}>
            <PiggyBank coins={coins} />
          </Suspense>
        </SceneBoundary>
      ) : (
        fallback
      )}
    </div>
  )
}
