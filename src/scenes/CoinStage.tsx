// 3D와 2D 폴백 선택. 3D 모듈은 동적 import로 분리
import { Component, Suspense, lazy, useEffect, useState, type ReactNode } from 'react'
import type { CoinSplit } from '../core/coinCount.ts'
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

export function CoinStage({ split, reduce3d }: { split: CoinSplit; reduce3d: boolean }) {
  const { principal, grown } = split
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
  const fallback = <CoinFallback2d principal={principal} grown={grown} />

  return (
    <>
      <div
        className="coin-stage"
        role="img"
        aria-label={`원금 코인 ${principal}개, 불어난 코인 ${grown}개 쌓임`}
        data-testid={use3d ? 'coin-stage-3d' : 'coin-stage-2d'}
      >
        {use3d ? (
          <SceneBoundary fallback={fallback} onError={() => setFailed(true)}>
            <Suspense fallback={fallback}>
              <PiggyBank principal={principal} grown={grown} />
            </Suspense>
          </SceneBoundary>
        ) : (
          fallback
        )}
      </div>
      {/* 범례. 정보는 대체 텍스트에 이미 있으므로 보조 기기에서는 숨김 */}
      <p className="coin-legend" aria-hidden="true">
        <span><i className="swatch-principal" />원금</span>
        <span><i className="swatch-grown" />불어난 만큼</span>
      </p>
    </>
  )
}
