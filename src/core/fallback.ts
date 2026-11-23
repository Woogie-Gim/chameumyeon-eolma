// 3D 사용 여부 판정. 하나라도 해당하면 2D 폴백

export type RenderEnv = { webgl: boolean; reduce3d: boolean; reducedMotion: boolean }

export function shouldUse3d(env: RenderEnv): boolean {
  return env.webgl && !env.reduce3d && !env.reducedMotion
}

// 캔버스 생성 함수를 주입받아 webgl 컨텍스트 확인
export function detectWebgl(createCanvas: () => HTMLCanvasElement): boolean {
  try {
    const canvas = createCanvas()
    return Boolean(canvas.getContext('webgl2') || canvas.getContext('webgl'))
  } catch {
    return false
  }
}

type MatchMedia = (query: string) => { matches: boolean }

export function prefersReducedMotion(matchMedia: MatchMedia | undefined): boolean {
  try {
    return matchMedia ? matchMedia('(prefers-reduced-motion: reduce)').matches : false
  } catch {
    return false
  }
}
