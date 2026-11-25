// 3D 타로 펼침. 직교 카메라(1 단위 = 1 CSS px)라 DOM 버튼 위치(spreadLayout)와 정확히 겹친다
// 입력은 위에 놓인 DOM 버튼이 받고, 이 장면은 그리기만 한다. 움직이는 동안만 프레임 요청
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Color, type Group, type Mesh, type MeshStandardMaterial } from 'three'
import { SPREAD_CARD_W, type SpreadSlot } from '../core/tarot.ts'
import { watchContextLost } from './contextLost.ts'
import { SceneLights } from './SceneLights.tsx'
import { readSceneColors, type SceneColors } from './sceneColors.ts'
import { CardFaces } from './TarotCard.tsx'
import { SPREAD_DIM, liftOf } from './spreadMotion.ts'

const HALF_TURN = Math.PI
const DEG = Math.PI / 180
const EASE_RATE = 7
const MAX_DELTA = 1 / 30
const LAYER_GAP = 2 // 카드 사이 깊이(px). 오른쪽 카드가 위
const PICKED_Z = 80 // 고른 카드는 다른 카드보다 앞
const FLIP_RAISE = 40 // 뒤집는 중간에 앞으로 나오는 정도

function approach(v: number, target: number, k: number, eps: number) {
  const d = target - v
  return Math.abs(d) < eps ? target : v + d * k
}

type CardProps = { id: number; index: number; slot: SpreadSlot; picked: number | null; active: number | null; colors: SceneColors }

function SpreadCard({ id, index, slot, picked, active, colors }: CardProps) {
  const outer = useRef<Group>(null)
  const inner = useRef<Group>(null)
  const invalidate = useThree((s) => s.invalidate)
  const isPicked = picked === index
  const target = { angle: isPicked ? 0 : HALF_TURN, lift: liftOf(index, picked, active), fade: picked !== null && !isPicked ? SPREAD_DIM : 1 }
  // 이미 고른 상태로 열리면 앞면에서 시작
  const [initial] = useState(() => ({ ...target }))
  const st = useRef({ ...initial })
  const appliedFade = useRef(-1)
  const stageBg = useMemo(() => new Color(colors.stageBg).convertLinearToSRGB(), [colors])

  useEffect(() => {
    invalidate()
  }, [target.angle, target.lift, target.fade, invalidate])

  useFrame((_, delta) => {
    const o = outer.current
    const g = inner.current
    if (!o || !g) return
    const k = 1 - Math.exp(-Math.min(delta, MAX_DELTA) * EASE_RATE)
    const s = st.current
    s.angle = approach(s.angle, target.angle, k, 0.002)
    s.lift = approach(s.lift, target.lift, k, 0.1)
    s.fade = approach(s.fade, target.fade, k, 0.005)
    // DOM은 y가 아래, 회전은 시계 방향이 양수라 부호를 뒤집는다
    o.position.set(slot.x, -(slot.y - s.lift), index * LAYER_GAP + (isPicked ? PICKED_Z : 0) + Math.sin(s.angle) * FLIP_RAISE)
    o.rotation.z = -slot.rot * DEG
    g.rotation.y = s.angle
    // 흐리게: 투명도 대신 무대 배경색 쪽으로 색을 섞는다(겹친 면이 비쳐 보이지 않게)
    if (s.fade !== appliedFade.current) {
      appliedFade.current = s.fade
      g.traverse((obj) => {
        const m = (obj as Mesh).material as MeshStandardMaterial | undefined
        if (!m?.color) return
        // 눈에 보이는 정도가 2D 투명도와 비슷하도록 sRGB에서 섞는다
        const base = (m.userData.baseColor ??= m.color.clone()) as Color
        m.color.copy(base).convertLinearToSRGB().lerp(stageBg, 1 - s.fade).convertSRGBToLinear()
      })
    }
    if (s.angle !== target.angle || s.lift !== target.lift || s.fade !== target.fade) invalidate()
  })

  return (
    <group ref={outer} position={[slot.x, -slot.y, index * LAYER_GAP]} rotation={[0, 0, -slot.rot * DEG]}>
      <group ref={inner} rotation={[0, initial.angle, 0]}>
        <CardFaces id={id} colors={colors} widthPx={SPREAD_CARD_W} />
      </group>
    </group>
  )
}

type Props = { ids: number[]; slots: SpreadSlot[]; picked: number | null; active: number | null; onLost: () => void; onReady: () => void }

export default function TarotSpread3d({ ids, slots, picked, active, onLost, onReady }: Props) {
  const colors = useMemo(() => readSceneColors(), [])
  return (
    <Canvas
      aria-hidden="true"
      orthographic
      frameloop="demand"
      dpr={[1, 2]}
      gl={{ antialias: true, alpha: true, powerPreference: 'low-power' }}
      camera={{ position: [0, 0, 500], zoom: 1, near: 1, far: 1000 }}
      onCreated={({ gl }) => {
        watchContextLost(gl.domElement, onLost)
        onReady()
      }}
    >
      {/* 단일 카드 장면과 같은 조명 구성 */}
      <SceneLights ambient={1.9} main={1.5} position={[2, 3, 4]} />
      {ids.map((id, i) => (
        <SpreadCard key={`${id}-${i}`} id={id} index={i} slot={slots[i]} picked={picked} active={active} colors={colors} />
      ))}
    </Canvas>
  )
}
