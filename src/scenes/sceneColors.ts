// tokens.css 색 변수 읽기
export type SceneColors = {
  piggy: string
  piggyShade: string
  eye: string
  coinPrincipal: string
  coinGrown: string
}

const FALLBACK: SceneColors = {
  piggy: '#e9a3a0',
  piggyShade: '#c9706c',
  eye: '#2b2b2b',
  coinPrincipal: '#8e9a9d',
  coinGrown: '#e0b04a',
}

export function readSceneColors(): SceneColors {
  try {
    const css = getComputedStyle(document.documentElement)
    const v = (name: string, fb: string) => css.getPropertyValue(name).trim() || fb
    return {
      piggy: v('--color-piggy', FALLBACK.piggy),
      piggyShade: v('--color-piggy-shade', FALLBACK.piggyShade),
      eye: v('--color-piggy-eye', FALLBACK.eye),
      coinPrincipal: v('--color-coin-principal', FALLBACK.coinPrincipal),
      coinGrown: v('--color-coin-grown', FALLBACK.coinGrown),
    }
  } catch {
    return FALLBACK
  }
}
