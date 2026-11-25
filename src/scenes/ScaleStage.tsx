// 저울 3D와 2D 폴백 선택. 3D 모듈은 동적 import로 분리
import { Suspense, lazy } from 'react'
import { coinSplit } from '../core/coinCount.ts'
import { scaleAltText, scaleTilt } from '../core/scaleTilt.ts'
import { ScaleFallback2d } from './ScaleFallback2d.tsx'
import { SceneBoundary } from './SceneBoundary.tsx'
import { SceneLoading } from './SceneLoading.tsx'
import { useUse3d } from './useUse3d.ts'

const Scale = lazy(() => import('./Scale.tsx'))

type Props = { spend: number; converted: number; spendLabel: string; reduce3d: boolean }

export function ScaleStage({ spend, converted, spendLabel, reduce3d }: Props) {
  const { use3d, onFail } = useUse3d(reduce3d)
  const split = coinSplit(spend, converted)
  const fallback = <ScaleFallback2d spend={spend} converted={converted} spendLabel={spendLabel} />
  return (
    <>
      <div
        className={use3d ? 'coin-stage stage-3d-scale' : 'coin-stage'}
        role="img"
        aria-label={scaleAltText(spendLabel, spend, converted)}
        data-testid={use3d ? 'scale-stage-3d' : 'scale-stage-2d'}
      >
        {use3d ? (
          <SceneBoundary fallback={fallback} onError={onFail}>
            <Suspense fallback={<SceneLoading>{fallback}</SceneLoading>}>
              <Scale tilt={scaleTilt(spend, converted)} coins={split.total} principal={split.principal} onLost={onFail} />
            </Suspense>
          </SceneBoundary>
        ) : (
          fallback
        )}
      </div>
      <p className="coin-legend" aria-hidden="true">
        <span><i className="swatch-spend" />{spendLabel}</span>
        <span><i className="swatch-grown" />환산 금액</span>
      </p>
    </>
  )
}
