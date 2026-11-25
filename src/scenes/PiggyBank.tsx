// 3D 저금통과 코인 탑. 프로시저럴 지오메트리만 사용, 카메라 조작 없음
// 변화가 있을 때만 프레임을 요청한다(frameloop demand)
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import { Color, CylinderGeometry, InstancedMesh, MeshStandardMaterial, Object3D } from 'three'
import { COIN_MAX } from '../core/coinCount.ts'
import { watchContextLost } from './contextLost.ts'
import { SceneLights } from './SceneLights.tsx'
import { readSceneColors, type SceneColors } from './sceneColors.ts'

const COIN_R = 0.2
const COIN_H = 0.07
const COIN_GAP = 0.075
const PER_COLUMN = 20
// 열 위치(x, z). 한 열이 차면 다음 열. 뒤 열은 엇갈려 보이게 배치
const COLUMNS: [number, number][] = [
  [0.6, 0.4],
  [1.08, 0.4],
  [0.84, -0.3],
  [1.32, -0.3],
]
const MAX_DELTA = 1 / 30
const QUARTER_TURN = Math.PI / 2
const EASE_RATE = 6
// 반짝임: 다 쌓인 직후 맨 위 코인 몇 개가 잠깐 밝아졌다 돌아온다
// 새 재질이나 셰이더 없이 인스턴스 색만 바꿔 저사양에서도 부담이 없다
const SPARKLE_MS = 700
const SPARKLE_COINS = 3

function Piggy({ colors }: { colors: SceneColors }) {
  return (
    <group position={[-0.75, 0.75, 0]} rotation={[0, 0.5, 0]}>
      {/* 몸통 */}
      <mesh scale={[1.25, 1, 1]}>
        <sphereGeometry args={[0.7, 32, 24]} />
        <meshStandardMaterial color={colors.piggy} roughness={0.45} />
      </mesh>
      {/* 코 */}
      <mesh position={[0, -0.05, 0.68]} rotation={[QUARTER_TURN, 0, 0]}>
        <cylinderGeometry args={[0.22, 0.24, 0.18, 24]} />
        <meshStandardMaterial color={colors.piggyShade} roughness={0.5} />
      </mesh>
      {/* 눈 */}
      {[-0.22, 0.22].map((x) => (
        <mesh key={x} position={[x, 0.2, 0.6]}>
          <sphereGeometry args={[0.05, 12, 8]} />
          <meshStandardMaterial color={colors.eye} roughness={0.2} />
        </mesh>
      ))}
      {/* 귀 */}
      {[-0.35, 0.35].map((x) => (
        <mesh key={x} position={[x, 0.62, 0.2]} rotation={[0.3, 0, x > 0 ? -0.3 : 0.3]}>
          <boxGeometry args={[0.22, 0.22, 0.06]} />
          <meshStandardMaterial color={colors.piggyShade} roughness={0.5} />
        </mesh>
      ))}
      {/* 다리 */}
      {[
        [-0.45, 0.3],
        [0.45, 0.3],
        [-0.45, -0.3],
        [0.45, -0.3],
      ].map(([x, z]) => (
        <mesh key={`${x}-${z}`} position={[x, -0.65, z]}>
          <cylinderGeometry args={[0.12, 0.12, 0.3, 16]} />
          <meshStandardMaterial color={colors.piggyShade} roughness={0.5} />
        </mesh>
      ))}
      {/* 동전 투입구 */}
      <mesh position={[0, 0.7, -0.05]}>
        <boxGeometry args={[0.4, 0.04, 0.08]} />
        <meshStandardMaterial color={colors.eye} />
      </mesh>
    </group>
  )
}

// 인덱스 principal 미만은 원금색, 이상은 불어난 코인색
function Coins({ target, principal, colors }: { target: number; principal: number; colors: SceneColors }) {
  const mesh = useRef<InstancedMesh>(null)
  const current = useRef(0)
  const invalidate = useThree((s) => s.invalidate)
  const dummy = useMemo(() => new Object3D(), [])
  const geometry = useMemo(() => new CylinderGeometry(COIN_R, COIN_R, COIN_H, 28), [])
  // 인스턴스 색 곱해지도록 재질은 흰색. 금속 반사감은 metalness와 하이라이트 조명으로
  const material = useMemo(() => new MeshStandardMaterial({ color: '#ffffff', metalness: 0.45, roughness: 0.3 }), [])
  const principalColor = useMemo(() => new Color(colors.coinPrincipal), [colors])
  const grownColor = useMemo(() => new Color(colors.coinGrown), [colors])

  // 언마운트 시 해제
  useEffect(() => () => geometry.dispose(), [geometry])
  useEffect(() => () => material.dispose(), [material])

  const shineColor = useMemo(() => new Color(colors.coinShine), [colors])
  const mixed = useMemo(() => new Color(), [])
  const sparkleStart = useRef<number | null>(null)
  const settled = useRef(0)

  // 목표가 바뀌면 프레임 재개
  useEffect(() => {
    invalidate()
  }, [target, principal, invalidate])

  useFrame((_, delta) => {
    const m = mesh.current
    if (!m) return
    const diff = target - current.current
    if (Math.abs(diff) < 0.01) current.current = target
    else current.current += diff * (1 - Math.exp(-Math.min(delta, MAX_DELTA) * EASE_RATE))

    const full = Math.floor(current.current)
    const frac = current.current - full
    const shown = Math.min(COIN_MAX, full + (frac > 0.01 ? 1 : 0))
    for (let i = 0; i < shown; i++) {
      const [x, z] = COLUMNS[Math.floor(i / PER_COLUMN) % COLUMNS.length]
      const level = i % PER_COLUMN
      const s = i === full ? frac : 1 // 맨 위 코인 부분 스케일
      dummy.position.set(x + (level % 2 ? 0.01 : -0.01), COIN_H / 2 + level * COIN_GAP, z)
      dummy.scale.set(s, s, s)
      dummy.updateMatrix()
      m.setMatrixAt(i, dummy.matrix)
      m.setColorAt(i, i < principal ? principalColor : grownColor)
    }

    // 늘어나서 목표에 닿은 순간 반짝임 시작
    if (current.current === target && target !== settled.current) {
      if (target > settled.current && target > principal) sparkleStart.current = performance.now()
      settled.current = target
    }
    let sparkling = false
    if (sparkleStart.current !== null) {
      const t = (performance.now() - sparkleStart.current) / SPARKLE_MS
      if (t >= 1) sparkleStart.current = null
      else sparkling = true
      const k = t >= 1 ? 0 : Math.sin(Math.PI * t)
      // 맨 위 코인부터 조금씩 늦게 밝아진다
      for (let j = 0; j < SPARKLE_COINS; j++) {
        const i = shown - 1 - j
        if (i < principal || i < 0) break
        const kj = Math.max(0, k - j * 0.2)
        m.setColorAt(i, mixed.copy(grownColor).lerp(shineColor, kj * 0.8))
      }
    }
    m.count = shown
    m.instanceMatrix.needsUpdate = true
    if (m.instanceColor) m.instanceColor.needsUpdate = true

    // 목표에 닿지 않았거나 반짝이는 동안만 다음 프레임 요청
    if (current.current !== target || sparkling) invalidate()
  })

  return <instancedMesh ref={mesh} args={[geometry, material, COIN_MAX]} />
}

export default function PiggyBank({ principal, grown, onLost }: { principal: number; grown: number; onLost: () => void }) {
  const colors = useMemo(() => readSceneColors(), [])
  return (
    <Canvas
      aria-hidden="true"
      frameloop="demand"
      dpr={[1, 2]}
      gl={{ antialias: true, alpha: true, powerPreference: 'low-power' }}
      camera={{ position: [0.6, 1.6, 4.4], fov: 40 }}
      onCreated={({ camera, gl }) => {
        camera.lookAt(0.2, 0.6, 0)
        watchContextLost(gl.domElement, onLost)
      }}
    >
      {/* 바닥 그림자는 CSS(.stage-3d-piggy) */}
      <SceneLights ambient={0.95} main={1.8} position={[2, 5, 5]} />
      <Piggy colors={colors} />
      <Coins target={principal + grown} principal={principal} colors={colors} />
    </Canvas>
  )
}
