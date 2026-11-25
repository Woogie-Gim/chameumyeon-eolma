// tokens.css 색 변수 읽기
export type SceneColors = {
  piggy: string
  piggyShade: string
  eye: string
  coinPrincipal: string
  coinGrown: string
  tarotBack: string
  tarotFront: string
  tarotInk: string
  tarotEdge: string
  scaleFrame: string
  scalePan: string
  spendPile: string
}

const FALLBACK: SceneColors = {
  piggy: '#a9d8d0',
  piggyShade: '#6fb0a5',
  eye: '#191f28',
  coinPrincipal: '#8b95a1',
  coinGrown: '#e0b04a',
  tarotBack: '#2c4775',
  tarotFront: '#ffffff',
  tarotInk: '#5fb3a7',
  tarotEdge: '#1f3557',
  scaleFrame: '#8b95a1',
  scalePan: '#c5ccd4',
  spendPile: '#4a6699',
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
      tarotBack: v('--color-tarot-back', FALLBACK.tarotBack),
      tarotFront: v('--color-tarot-front', FALLBACK.tarotFront),
      tarotInk: v('--color-tarot-ink', FALLBACK.tarotInk),
      tarotEdge: v('--color-tarot-edge', FALLBACK.tarotEdge),
      scaleFrame: v('--color-scale-frame', FALLBACK.scaleFrame),
      scalePan: v('--color-scale-pan', FALLBACK.scalePan),
      spendPile: v('--color-spend-pile', FALLBACK.spendPile),
    }
  } catch {
    return FALLBACK
  }
}
