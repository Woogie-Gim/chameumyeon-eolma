// sound.ts 단위 테스트. 가짜 AudioContext와 진동 함수를 주입한다
import { describe, expect, it, vi } from 'vitest'
import { MASTER_GAIN, TONES, VIBRATION, createSoundPlayer, noopSound, type AudioContextLike, type SoundKind } from '../../src/sound/sound.ts'

function fakeContext(state = 'running') {
  const oscillators: { type: string; started: number[]; stopped: number[]; freq: number[] }[] = []
  const gains: number[] = []
  const param = (log: number[]) => ({
    setValueAtTime: (v: number) => void log.push(v),
    exponentialRampToValueAtTime: (v: number) => void log.push(v),
  })
  const ctx = {
    currentTime: 1,
    state,
    destination: {},
    resume: vi.fn(() => Promise.resolve()),
    createOscillator() {
      const o = { type: 'sine', started: [] as number[], stopped: [] as number[], freq: [] as number[] }
      oscillators.push(o)
      return {
        get type() {
          return o.type as OscillatorType
        },
        set type(v: OscillatorType) {
          o.type = v
        },
        frequency: param(o.freq),
        connect: () => undefined,
        start: (t: number) => void o.started.push(t),
        stop: (t: number) => void o.stopped.push(t),
      }
    },
    createGain() {
      return { gain: param(gains), connect: () => undefined }
    },
  }
  return { ctx: ctx as unknown as AudioContextLike & { resume: ReturnType<typeof vi.fn> }, oscillators, gains }
}

const KINDS: SoundKind[] = ['tap', 'reveal', 'flip', 'error']

describe('createSoundPlayer', () => {
  it('첫 재생 전에는 AudioContext를 만들지 않고, 이후 한 번만 만든다', () => {
    const { ctx } = fakeContext()
    const createContext = vi.fn(() => ctx)
    const p = createSoundPlayer({ enabled: true, createContext })
    expect(createContext).not.toHaveBeenCalled()
    p.play('tap')
    p.play('reveal')
    expect(createContext).toHaveBeenCalledTimes(1)
  })

  it('종류마다 정의한 수만큼 톤을 재생하고 0.5초 안에 멈춘다', () => {
    for (const kind of KINDS) {
      const { ctx, oscillators } = fakeContext()
      createSoundPlayer({ enabled: true, createContext: () => ctx }).play(kind)
      expect(oscillators).toHaveLength(TONES[kind].length)
      for (const o of oscillators) {
        expect(o.started).toHaveLength(1)
        expect(o.stopped[0] - ctx.currentTime).toBeLessThan(0.5)
      }
    }
  })

  it('볼륨은 작게: 최대 이득이 MASTER_GAIN 이하', () => {
    const { ctx, gains } = fakeContext()
    const p = createSoundPlayer({ enabled: true, createContext: () => ctx })
    for (const kind of KINDS) p.play(kind)
    expect(Math.max(...gains)).toBeLessThanOrEqual(MASTER_GAIN)
    expect(MASTER_GAIN).toBeLessThanOrEqual(0.1)
  })

  it('꺼져 있으면 소리도 진동도 없다', () => {
    const createContext = vi.fn(() => fakeContext().ctx)
    const vibrate = vi.fn(() => true)
    const p = createSoundPlayer({ enabled: false, createContext, vibrate })
    for (const kind of KINDS) p.play(kind)
    expect(createContext).not.toHaveBeenCalled()
    expect(vibrate).not.toHaveBeenCalled()
  })

  it('setEnabled로 켜고 끈다', () => {
    const { ctx, oscillators } = fakeContext()
    const p = createSoundPlayer({ enabled: false, createContext: () => ctx })
    p.play('tap')
    expect(oscillators).toHaveLength(0)
    p.setEnabled(true)
    p.play('tap')
    expect(oscillators).toHaveLength(1)
    p.setEnabled(false)
    p.play('tap')
    expect(oscillators).toHaveLength(1)
  })

  it('AudioContext 생성이 실패하거나 없으면 조용히 무시하고 다시 만들지 않는다', () => {
    const throwing = vi.fn(() => {
      throw new Error('NotAllowedError')
    })
    const p = createSoundPlayer({ enabled: true, createContext: throwing })
    expect(() => p.play('tap')).not.toThrow()
    expect(() => p.play('tap')).not.toThrow()
    expect(throwing).toHaveBeenCalledTimes(1)

    const missing = vi.fn(() => null)
    const q = createSoundPlayer({ enabled: true, createContext: missing })
    expect(() => q.play('reveal')).not.toThrow()
    q.play('reveal')
    expect(missing).toHaveBeenCalledTimes(1)
  })

  it('재생 중 예외(무음 장치 등)는 삼킨다', () => {
    const { ctx } = fakeContext()
    ctx.createOscillator = () => {
      throw new Error('InvalidStateError')
    }
    expect(() => createSoundPlayer({ enabled: true, createContext: () => ctx }).play('flip')).not.toThrow()
  })

  it('suspended 상태면 resume을 부르고, resume 거부도 무시한다', async () => {
    const { ctx } = fakeContext('suspended')
    ctx.resume.mockImplementation(() => Promise.reject(new Error('denied')))
    createSoundPlayer({ enabled: true, createContext: () => ctx }).play('tap')
    expect(ctx.resume).toHaveBeenCalledTimes(1)
    await Promise.resolve()
  })

  it('진동은 정해진 패턴으로, 탭은 진동 없음', () => {
    const vibrate = vi.fn(() => true)
    const p = createSoundPlayer({ enabled: true, createContext: () => null, vibrate })
    p.play('tap')
    expect(vibrate).not.toHaveBeenCalled()
    p.play('reveal')
    p.play('flip')
    p.play('error')
    expect(vibrate.mock.calls).toEqual([[VIBRATION.reveal], [VIBRATION.flip], [VIBRATION.error]])
  })

  it('진동 미지원이거나 예외면 무시하고 소리는 낸다', () => {
    const { ctx, oscillators } = fakeContext()
    const p = createSoundPlayer({
      enabled: true,
      createContext: () => ctx,
      vibrate: () => {
        throw new Error('blocked')
      },
    })
    expect(() => p.play('error')).not.toThrow()
    expect(oscillators).toHaveLength(TONES.error.length)
    expect(() => createSoundPlayer({ enabled: true, createContext: () => ctx }).play('reveal')).not.toThrow()
  })
})

describe('noopSound', () => {
  it('아무 일도 하지 않는다', () => {
    expect(() => {
      noopSound.setEnabled(true)
      noopSound.play('reveal')
    }).not.toThrow()
  })
})
