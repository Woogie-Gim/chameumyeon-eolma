// 타로 카드 3D와 2D 폴백 선택. 3D 모듈은 동적 import로 분리
import { Suspense, lazy } from 'react'
import { SceneBoundary } from './SceneBoundary.tsx'
import { TarotFallback2d } from './TarotFallback2d.tsx'
import { useUse3d } from './useUse3d.ts'

const TarotCard = lazy(() => import('./TarotCard.tsx'))

type Props = { id: number; name: string; keyword: string; drawn: boolean; reduce3d: boolean }

export function TarotStage({ id, name, keyword, drawn, reduce3d }: Props) {
  const { use3d, onFail } = useUse3d(reduce3d)
  const fallback = <TarotFallback2d id={id} drawn={drawn} />
  return (
    <div
      className="tarot-stage"
      role="img"
      aria-label={drawn ? `오늘의 카드: ${name}, 키워드 ${keyword}` : '뒤집히지 않은 카드 뒷면'}
      data-testid={use3d ? 'tarot-stage-3d' : 'tarot-stage-2d'}
    >
      {use3d ? (
        <SceneBoundary fallback={fallback} onError={onFail}>
          <Suspense fallback={fallback}>
            <TarotCard id={id} drawn={drawn} />
          </Suspense>
        </SceneBoundary>
      ) : (
        fallback
      )}
    </div>
  )
}
