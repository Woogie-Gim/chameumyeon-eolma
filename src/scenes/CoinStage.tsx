// 3D 저금통과 2D 폴백 선택. 3D 모듈은 동적 import로 분리
import { Suspense, lazy } from 'react'
import type { CoinSplit } from '../core/coinCount.ts'
import { CoinFallback2d } from './CoinFallback2d.tsx'
import { SceneBoundary } from './SceneBoundary.tsx'
import { SceneLoading } from './SceneLoading.tsx'
import { useUse3d } from './useUse3d.ts'

const PiggyBank = lazy(() => import('./PiggyBank.tsx'))

export function CoinStage({ split, reduce3d }: { split: CoinSplit; reduce3d: boolean }) {
  const { principal, grown } = split
  const { use3d, onFail } = useUse3d(reduce3d)
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
          <SceneBoundary fallback={fallback} onError={onFail}>
            <Suspense fallback={<SceneLoading>{fallback}</SceneLoading>}>
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
