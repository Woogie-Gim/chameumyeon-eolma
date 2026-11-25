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
  coinShine: string
  stageBg: string
}

const FALLBACK: SceneColors = {
  piggy: '#9fdcd2',
  piggyShade: '#5fb3a6',
  eye: '#191f28',
  coinPrincipal: '#9aa4b1',
  coinGrown: '#e8b445',
  tarotBack: '#5434b0',
  tarotFront: '#ffffff',
  tarotInk: '#2fbfad',
  tarotEdge: '#3b2585',
  scaleFrame: '#8b95a1',
  scalePan: '#c9cfd6',
  spendPile: '#7b5ce0',
  coinShine: '#fff3c9',
  stageBg: '#f5f0ea',
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
      coinShine: v('--color-coin-shine', FALLBACK.coinShine),
      stageBg: v('--color-stage-bg', FALLBACK.stageBg),
    }
  } catch {
    return FALLBACK
  }
}
