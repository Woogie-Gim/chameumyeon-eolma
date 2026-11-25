// 3D 타로 카드 뒤집기. plane 메시와 프로시저럴 무늬만 사용, 텍스처와 외부 폰트 없음
// 뒤집는 동안만 프레임을 요청한다(frameloop demand)
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { useEffect, useMemo, useRef, useState } from 'react'
import { DoubleSide, Shape, type Group } from 'three'
import { watchContextLost } from './contextLost.ts'
import { readSceneColors, type SceneColors } from './sceneColors.ts'
import { starPoints, tarotPattern } from './tarotPattern.ts'

const W = 1.4
const H = 2.2
const CARD_DEPTH = 0.02
const FACE_GAP = 0.002 // 면 위 장식 간격
const HALF_TURN = Math.PI
const QUARTER = Math.PI / 4
const EASE_RATE = 5
const MAX_DELTA = 1 / 30

// 테두리 프레임. 얇은 plane 네 장
function Frame({ w, h, t, color, z }: { w: number; h: number; t: number; color: string; z: number }) {
  const bars: [number, number, number, number][] = [
    [0, h / 2 - t / 2, w, t],
    [0, -h / 2 + t / 2, w, t],
    [-w / 2 + t / 2, 0, t, h],
    [w / 2 - t / 2, 0, t, h],
  ]
  return (
    <group position={[0, 0, z]}>
      {bars.map(([x, y, bw, bh]) => (
        <mesh key={`${x}-${y}`} position={[x, y, 0]}>
          <planeGeometry args={[bw, bh]} />
          <meshStandardMaterial color={color} roughness={0.5} />
        </mesh>
      ))}
    </group>
  )
}

function Back({ colors }: { colors: SceneColors }) {
  return (
    <group position={[0, 0, -CARD_DEPTH / 2 - FACE_GAP]} rotation={[0, HALF_TURN, 0]}>
      <mesh>
        <planeGeometry args={[W, H]} />
        <meshStandardMaterial color={colors.tarotBack} roughness={0.6} />
      </mesh>
      <Frame w={W - 0.16} h={H - 0.16} t={0.035} color={colors.tarotInk} z={FACE_GAP} />
      {/* 가운데 마름모와 링 */}
      <mesh position={[0, 0, FACE_GAP]} rotation={[0, 0, QUARTER]}>
        <planeGeometry args={[0.55, 0.55]} />
        <meshStandardMaterial color={colors.tarotEdge} roughness={0.6} />
      </mesh>
      <mesh position={[0, 0, FACE_GAP * 2]}>
        <ringGeometry args={[0.2, 0.25, 40]} />
        <meshStandardMaterial color={colors.tarotInk} roughness={0.5} />
      </mesh>
      {[-1, 1].map((s) => (
        <mesh key={s} position={[0, s * 0.68, FACE_GAP]} rotation={[0, 0, QUARTER]}>
          <planeGeometry args={[0.16, 0.16]} />
          <meshStandardMaterial color={colors.tarotInk} roughness={0.5} />
        </mesh>
      ))}
    </group>
  )
}

function Front({ id, colors }: { id: number; colors: SceneColors }) {
  const pattern = useMemo(() => tarotPattern(id), [id])
  const starShapes = useMemo(
    () =>
      pattern.stars.map((st) => {
        const shape = new Shape()
        const pts = starPoints(st.r * W)
        shape.moveTo(pts[0][0], pts[0][1])
        for (const [x, y] of pts.slice(1)) shape.lineTo(x, y)
        shape.closePath()
        return shape
      }),
    [pattern],
  )
  return (
    <group position={[0, 0, CARD_DEPTH / 2 + FACE_GAP]}>
      <mesh>
        <planeGeometry args={[W, H]} />
        <meshStandardMaterial color={colors.tarotFront} roughness={0.7} />
      </mesh>
      <Frame w={W - 0.12} h={H - 0.12} t={0.03} color={colors.tarotInk} z={FACE_GAP} />
      <mesh position={[0, 0, FACE_GAP]}>
        <circleGeometry args={[pattern.centerR * W, 40]} />
        <meshStandardMaterial color={colors.tarotInk} roughness={0.5} />
      </mesh>
      {pattern.stars.map((st, i) => (
        <mesh key={i} position={[st.x * W, st.y * W, FACE_GAP]}>
          <shapeGeometry args={[starShapes[i]]} />
          <meshStandardMaterial color={colors.tarotBack} roughness={0.5} side={DoubleSide} />
        </mesh>
      ))}
    </group>
  )
}

// 목표 각도까지 지수 보간. 닿으면 프레임 요청 중단
function Card({ id, drawn, colors }: { id: number; drawn: boolean; colors: SceneColors }) {
  const group = useRef<Group>(null)
  // 이미 뽑은 상태로 열리면 앞면에서 시작
  const [initial] = useState(() => (drawn ? 0 : HALF_TURN))
  const angle = useRef(initial)
  const invalidate = useThree((s) => s.invalidate)
  const target = drawn ? 0 : HALF_TURN

  useEffect(() => {
    invalidate()
  }, [target, invalidate])

  useFrame((_, delta) => {
    const g = group.current
    if (!g) return
    const diff = target - angle.current
    if (Math.abs(diff) < 0.002) angle.current = target
    else angle.current += diff * (1 - Math.exp(-Math.min(delta, MAX_DELTA) * EASE_RATE))
    g.rotation.y = angle.current
    // 뒤집는 중간에 살짝 들어 올림
    g.position.z = Math.sin(angle.current) * 0.4
    if (angle.current !== target) invalidate()
  })

  return (
    <group ref={group} rotation={[0, initial, 0]}>
      <mesh>
        <boxGeometry args={[W, H, CARD_DEPTH]} />
        <meshStandardMaterial color={colors.tarotEdge} roughness={0.6} />
      </mesh>
      <Front id={id} colors={colors} />
      <Back colors={colors} />
    </group>
  )
}

export default function TarotCard({ id, drawn, onLost }: { id: number; drawn: boolean; onLost: () => void }) {
  const colors = useMemo(() => readSceneColors(), [])
  return (
    <Canvas
      aria-hidden="true"
      frameloop="demand"
      dpr={[1, 2]}
      gl={{ antialias: true, alpha: true, powerPreference: 'low-power' }}
      camera={{ position: [0, 0, 4.2], fov: 40 }}
      onCreated={({ gl }) => watchContextLost(gl.domElement, onLost)}
    >
      <ambientLight intensity={1.3} />
      <directionalLight position={[2, 3, 4]} intensity={1.4} />
      <Card id={id} drawn={drawn} colors={colors} />
    </Canvas>
  )
}
