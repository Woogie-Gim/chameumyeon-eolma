// 효과음과 진동. 음원 파일 없이 Web Audio API로 짧은 톤을 합성한다
// AudioContext는 첫 재생 요청(항상 사용자 입력 핸들러 안) 때 만든다. 실패는 모두 조용히 무시한다
export type SoundKind = 'tap' | 'reveal' | 'flip' | 'error'

export interface SoundPlayer {
  play(kind: SoundKind): void
  setEnabled(on: boolean): void
}

// 테스트에서 바꿔 끼울 수 있게 필요한 부분만 정의
type ParamLike = {
  setValueAtTime(v: number, t: number): unknown
  exponentialRampToValueAtTime(v: number, t: number): unknown
}
type NodeLike = { connect(dest: unknown): unknown }
type OscillatorLike = NodeLike & {
  type: OscillatorType
  frequency: ParamLike
  start(t: number): void
  stop(t: number): void
}
type GainLike = NodeLike & { gain: ParamLike }
export type AudioContextLike = {
  readonly currentTime: number
  readonly state: string
  readonly destination: unknown
  resume(): Promise<void>
  createOscillator(): OscillatorLike
  createGain(): GainLike
}

export type SoundDeps = {
  createContext: () => AudioContextLike | null
  vibrate?: (pattern: number | number[]) => boolean
  enabled: boolean
}

// 전체 볼륨. 작게 둔다
export const MASTER_GAIN = 0.06
const SILENT = 0.0001

type Tone = { type: OscillatorType; freq: number; to?: number; at: number; dur: number; vol: number }

// 종류별 톤. 모두 0.3초 안에 끝난다
export const TONES: Record<SoundKind, Tone[]> = {
  tap: [{ type: 'sine', freq: 660, at: 0, dur: 0.04, vol: 0.6 }],
  // 코인 쌓임: 짧은 상행 3음
  reveal: [
    { type: 'triangle', freq: 1046.5, at: 0, dur: 0.09, vol: 0.8 },
    { type: 'triangle', freq: 1318.5, at: 0.07, dur: 0.09, vol: 0.8 },
    { type: 'triangle', freq: 1568, at: 0.14, dur: 0.14, vol: 0.9 },
  ],
  // 카드 넘김: 위로 미끄러지는 음
  flip: [{ type: 'sine', freq: 300, to: 900, at: 0, dur: 0.12, vol: 0.8 }],
  // 입력 오류: 낮은 두 음
  error: [
    { type: 'square', freq: 220, at: 0, dur: 0.08, vol: 0.35 },
    { type: 'square', freq: 165, at: 0.1, dur: 0.12, vol: 0.35 },
  ],
}

// 진동 패턴(ms). 버튼 탭은 진동 없음
export const VIBRATION: Partial<Record<SoundKind, number | number[]>> = {
  reveal: 20,
  flip: 15,
  error: [30, 40, 30],
}

export const noopSound: SoundPlayer = {
  play() {},
  setEnabled() {},
}

export function createSoundPlayer(deps: SoundDeps): SoundPlayer {
  let enabled = deps.enabled
  let ctx: AudioContextLike | null = null
  let broken = false // 생성 실패 후에는 다시 시도하지 않는다

  function getContext(): AudioContextLike | null {
    if (ctx || broken) return ctx
    try {
      ctx = deps.createContext()
    } catch {
      ctx = null
    }
    if (!ctx) broken = true
    return ctx
  }

  function vibrate(kind: SoundKind) {
    const pattern = VIBRATION[kind]
    if (pattern === undefined || !deps.vibrate) return
    try {
      deps.vibrate(pattern)
    } catch {
      // 미지원 또는 거부
    }
  }

  function tone(c: AudioContextLike, t: Tone, t0: number) {
    const start = t0 + t.at
    const end = start + t.dur
    const osc = c.createOscillator()
    const gain = c.createGain()
    osc.type = t.type
    osc.frequency.setValueAtTime(t.freq, start)
    if (t.to) osc.frequency.exponentialRampToValueAtTime(t.to, end)
    // 딸깍 소리가 나지 않게 짧게 올렸다가 내린다
    gain.gain.setValueAtTime(SILENT, start)
    gain.gain.exponentialRampToValueAtTime(MASTER_GAIN * t.vol, start + 0.01)
    gain.gain.exponentialRampToValueAtTime(SILENT, end)
    osc.connect(gain)
    gain.connect(c.destination)
    osc.start(start)
    osc.stop(end + 0.02)
  }

  return {
    play(kind) {
      if (!enabled) return
      vibrate(kind)
      try {
        const c = getContext()
        if (!c) return
        if (c.state === 'suspended') c.resume().catch(() => undefined)
        const t0 = c.currentTime
        for (const t of TONES[kind]) tone(c, t, t0)
      } catch {
        // 시스템 무음, 장치 없음 등은 무시
      }
    },
    setEnabled(on) {
      enabled = on
    },
  }
}

// 브라우저 의존성. 모듈 로드 때는 아무것도 만들지 않는다
export function createBrowserSound(enabled: boolean): SoundPlayer {
  return createSoundPlayer({
    enabled,
    createContext: () => {
      if (typeof window === 'undefined') return null
      const w = window as unknown as { AudioContext?: new () => AudioContextLike; webkitAudioContext?: new () => AudioContextLike }
      const Ctor = w.AudioContext ?? w.webkitAudioContext
      return Ctor ? new Ctor() : null
    },
    vibrate:
      typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function' ? (p) => navigator.vibrate(p) : undefined,
  })
}
