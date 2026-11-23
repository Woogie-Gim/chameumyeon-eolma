// tokens.css 색 변수 읽기
export type SceneColors = { piggy: string; piggyShade: string; eye: string; coin: string; coinEdge: string }

const FALLBACK: SceneColors = { piggy: '#e9a3a0', piggyShade: '#c9706c', eye: '#2b2b2b', coin: '#e0b04a', coinEdge: '#b98a2a' }

export function readSceneColors(): SceneColors {
  try {
    const css = getComputedStyle(document.documentElement)
    const v = (name: string, fb: string) => css.getPropertyValue(name).trim() || fb
    return {
      piggy: v('--color-piggy', FALLBACK.piggy),
      piggyShade: v('--color-piggy-shade', FALLBACK.piggyShade),
      eye: v('--color-piggy-eye', FALLBACK.eye),
      coin: v('--color-coin', FALLBACK.coin),
      coinEdge: v('--color-coin-edge', FALLBACK.coinEdge),
    }
  } catch {
    return FALLBACK
  }
}
