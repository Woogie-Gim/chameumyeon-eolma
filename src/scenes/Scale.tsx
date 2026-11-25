// 3D 저울. 왼쪽 접시는 지금 쓰는 금액 더미, 오른쪽 접시는 환산 금액 코인 더미
// 프로시저럴 지오메트리만 사용, 조작 요소 없음. 기울기가 바뀌는 동안만 프레임 요청
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { useEffect, useLayoutEffect, useMemo, useRef } from 'react'
import { Color, CylinderGeometry, InstancedMesh, MeshStandardMaterial, Object3D, Quaternion, Vector3, type Group, type Mesh } from 'three'
import { COIN_BASE, COIN_MAX } from '../core/coinCount.ts'
import { readSceneColors, type SceneColors } from './sceneColors.ts'

const PIVOT_Y = 1.7
const ARM_LENGTH = 1.3 // 기둥에서 접시 고리까지
const HANG_LENGTH = 1.0 // 고리에서 접시까지
const PAN_R = 0.45
const ROD_THICKNESS = 0.025
const BLOCK_SIZE = 0.15
const BLOCKS_PER_LAYER = 3
const COIN_R = 0.12
const COIN_H = 0.06
const COIN_GAP = 0.065
const COIN_PER_COLUMN = 12
// 코인 열: 가운데 하나와 둘레 여섯
const COIN_COLUMNS: [number, number][] = [
  [0, 0],
  ...Array.from({ length: 6 }, (_, i): [number, number] => {
    const a = (i / 6) * Math.PI * 2
    return [Math.cos(a) * 0.26, Math.sin(a) * 0.26]
  }),
]
const EASE_RATE = 5
const MAX_DELTA = 1 / 30

// 접시 테 세 점에서 고리로 모이는 줄
function Strings({ color }: { color: string }) {
  const rods = useMemo(() => {
    const hook = new Vector3(0, HANG_LENGTH, 0)
    const up = new Vector3(0, 1, 0)
    return [0, 1, 2].map((i) => {
      const a = (i / 3) * Math.PI * 2 + 0.5
      const rim = new Vector3(Math.cos(a) * (PAN_R - 0.04), 0.02, Math.sin(a) * (PAN_R - 0.04))
      const dir = hook.clone().sub(rim)
      const mid = rim.clone().add(dir.clone().multiplyScalar(0.5))
      const q = new Quaternion().setFromUnitVectors(up, dir.clone().normalize())
      return { key: i, mid, q, len: dir.length() }
    })
  }, [])
  return (
    <>
      {rods.map((r) => (
        <mesh key={r.key} position={r.mid} quaternion={r.q}>
          <cylinderGeometry args={[0.008, 0.008, r.len, 6]} />
          <meshStandardMaterial color={color} />
        </mesh>
      ))}
    </>
  )
}

function Pan({ colors }: { colors: SceneColors }) {
  return (
    <>
      <mesh position={[0, 0, 0]}>
        <cylinderGeometry args={[PAN_R, PAN_R * 0.85, 0.05, 32]} />
        <meshStandardMaterial color={colors.scalePan} metalness={0.3} roughness={0.5} />
      </mesh>
      <Strings color={colors.scaleFrame} />
    </>
  )
}

// 지금 쓰는 금액 더미. 블록 COIN_BASE개(원금 1배)
function SpendPile({ colors }: { colors: SceneColors }) {
  const blocks = useMemo(
    () =>
      Array.from({ length: COIN_BASE }, (_, i) => {
        const layer = Math.floor(i / BLOCKS_PER_LAYER)
        const slot = i % BLOCKS_PER_LAYER
        // 위층일수록 안쪽으로 모아 더미 모양
        const spread = BLOCK_SIZE * 1.05 * (1 - layer * 0.12)
        return { key: i, x: (slot - 1) * spread, y: 0.025 + BLOCK_SIZE / 2 + layer * BLOCK_SIZE, z: (layer % 2 ? -1 : 1) * 0.04, r: (i % 3) * 0.2 }
      }),
    [],
  )
  return (
    <>
      {blocks.map((b) => (
        <mesh key={b.key} position={[b.x, b.y, b.z]} rotation={[0, b.r, 0]}>
          <boxGeometry args={[BLOCK_SIZE * 0.95, BLOCK_SIZE * 0.95, BLOCK_SIZE * 0.95]} />
          <meshStandardMaterial color={colors.spendPile} roughness={0.7} />
        </mesh>
      ))}
    </>
  )
}

// 환산 금액 코인 더미. 인덱스 principal 미만은 원금색
function CoinPile({ count, principal, colors }: { count: number; principal: number; colors: SceneColors }) {
  const mesh = useRef<InstancedMesh>(null)
  const invalidate = useThree((s) => s.invalidate)
  const geometry = useMemo(() => new CylinderGeometry(COIN_R, COIN_R, COIN_H, 24), [])
  const material = useMemo(() => new MeshStandardMaterial({ color: '#ffffff', metalness: 0.25, roughness: 0.4 }), [])
  const principalColor = useMemo(() => new Color(colors.coinPrincipal), [colors])
  const grownColor = useMemo(() => new Color(colors.coinGrown), [colors])

  useEffect(() => () => geometry.dispose(), [geometry])
  useEffect(() => () => material.dispose(), [material])

  useLayoutEffect(() => {
    const m = mesh.current
    if (!m) return
    const dummy = new Object3D()
    const shown = Math.min(count, COIN_MAX)
    for (let i = 0; i < shown; i++) {
      const [x, z] = COIN_COLUMNS[i % COIN_COLUMNS.length]
      const level = Math.floor(i / COIN_COLUMNS.length)
      dummy.position.set(x, 0.025 + COIN_H / 2 + level * COIN_GAP, z)
      dummy.updateMatrix()
      m.setMatrixAt(i, dummy.matrix)
      m.setColorAt(i, i < principal ? principalColor : grownColor)
    }
    m.count = shown
    m.instanceMatrix.needsUpdate = true
    if (m.instanceColor) m.instanceColor.needsUpdate = true
    invalidate()
  }, [count, principal, principalColor, grownColor, invalidate])

  return <instancedMesh ref={mesh} args={[geometry, material, COIN_COLUMNS.length * COIN_PER_COLUMN]} />
}

function Balance({ tilt, coins, principal, colors }: { tilt: number; coins: number; principal: number; colors: SceneColors }) {
  const beam = useRef<Mesh>(null)
  const left = useRef<Group>(null)
  const right = useRef<Group>(null)
  const current = useRef(0)
  const invalidate = useThree((s) => s.invalidate)

  useEffect(() => {
    invalidate()
  }, [tilt, invalidate])

  useFrame((_, delta) => {
    const diff = tilt - current.current
    if (Math.abs(diff) < 0.0005) current.current = tilt
    else current.current += diff * (1 - Math.exp(-Math.min(delta, MAX_DELTA) * EASE_RATE))
    // 양수 기울기면 오른쪽(환산 쪽)이 내려가도록 z축 음의 회전
    const a = -current.current
    if (beam.current) beam.current.rotation.z = a
    const dx = Math.cos(a) * ARM_LENGTH
    const dy = Math.sin(a) * ARM_LENGTH
    left.current?.position.set(-dx, PIVOT_Y - dy - HANG_LENGTH, 0)
    right.current?.position.set(dx, PIVOT_Y + dy - HANG_LENGTH, 0)
    if (current.current !== tilt) invalidate()
  })

  return (
    <>
      {/* 받침과 기둥 */}
      <mesh position={[0, 0.05, 0]}>
        <boxGeometry args={[1.2, 0.1, 0.6]} />
        <meshStandardMaterial color={colors.scaleFrame} roughness={0.6} />
      </mesh>
      <mesh position={[0, PIVOT_Y / 2 + 0.05, 0]}>
        <cylinderGeometry args={[0.05, 0.07, PIVOT_Y - 0.1, 16]} />
        <meshStandardMaterial color={colors.scaleFrame} roughness={0.6} />
      </mesh>
      <mesh position={[0, PIVOT_Y + 0.06, 0]}>
        <coneGeometry args={[0.08, 0.16, 16]} />
        <meshStandardMaterial color={colors.scaleFrame} roughness={0.6} />
      </mesh>
      {/* 빔 */}
      <mesh ref={beam} position={[0, PIVOT_Y, 0]}>
        <boxGeometry args={[ARM_LENGTH * 2 + 0.1, ROD_THICKNESS * 3, ROD_THICKNESS * 3]} />
        <meshStandardMaterial color={colors.scaleFrame} metalness={0.2} roughness={0.5} />
      </mesh>
      <group ref={left} position={[-ARM_LENGTH, PIVOT_Y - HANG_LENGTH, 0]}>
        <Pan colors={colors} />
        <SpendPile colors={colors} />
      </group>
      <group ref={right} position={[ARM_LENGTH, PIVOT_Y - HANG_LENGTH, 0]}>
        <Pan colors={colors} />
        <CoinPile count={coins} principal={principal} colors={colors} />
      </group>
    </>
  )
}

export default function Scale({ tilt, coins, principal }: { tilt: number; coins: number; principal: number }) {
  const colors = useMemo(readSceneColors, [])
  return (
    <Canvas
      aria-hidden="true"
      frameloop="demand"
      dpr={[1, 2]}
      gl={{ antialias: true, alpha: true, powerPreference: 'low-power' }}
      camera={{ position: [0, 1.5, 4.6], fov: 40 }}
      onCreated={({ camera }) => camera.lookAt(0, 1.0, 0)}
    >
      <ambientLight intensity={0.8} />
      <directionalLight position={[3, 5, 4]} intensity={1.5} />
      <Balance tilt={tilt} coins={coins} principal={principal} colors={colors} />
    </Canvas>
  )
}
