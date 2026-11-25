// 경로와 화면 매핑. 라우터 없이 history API로 쓴다
// 결과와 선택 화면은 입력에서 이어지는 흐름이라 경로가 없다(입력과 같은 "/")
export type RouteScreen = 'input' | 'log' | 'tarot' | 'settings' | 'guide'

const PATHS: Record<RouteScreen, string> = {
  input: '/',
  log: '/record',
  tarot: '/tarot',
  settings: '/settings',
  guide: '/info',
}

// base는 import.meta.env.BASE_URL 형식(앞뒤 슬래시 포함, 루트면 "/")
const trimBase = (base: string) => base.replace(/\/+$/, '')

// 경로를 화면으로. base 밖이거나 없는 경로는 null
export function pathToScreen(pathname: string, base: string): RouteScreen | null {
  const root = trimBase(base)
  if (root && pathname !== root && !pathname.startsWith(`${root}/`)) return null
  let rest = pathname.slice(root.length) || '/'
  // 끝 슬래시와 index.html은 같은 경로로 본다
  rest = rest.replace(/\/index\.html$/, '/')
  if (rest.length > 1) rest = rest.replace(/\/+$/, '')
  const hit = (Object.keys(PATHS) as RouteScreen[]).find((s) => PATHS[s] === rest)
  return hit ?? null
}

// 화면을 base가 붙은 경로로
export function screenToPath(screen: RouteScreen, base: string): string {
  const p = PATHS[screen]
  return p === '/' ? `${trimBase(base)}/` : `${trimBase(base)}${p}`
}
