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

// 경로 세그먼트(소문자)와 화면
const SEGMENTS: Record<string, RouteScreen> = { tarot: 'tarot', record: 'log', settings: 'settings', info: 'guide' }

// 앱인토스 앱 이름. 웹뷰가 경로 앞에 붙여 줄 가능성에 대비해 무시한다
const APP_NAME = 'chameumyeon-eolma'
// 쿼리로 화면을 지정하는 키(?page=tarot). 교정할 때 지운다
export const PAGE_PARAM = 'page'

// base는 import.meta.env.BASE_URL 형식(앞뒤 슬래시 포함, 루트면 "/")
const trimBase = (base: string) => base.replace(/\/+$/, '')

// 세그먼트 목록을 화면으로. 앱 이름과 index.html은 건너뛰고 마지막 세그먼트로 판단
// 세그먼트가 없으면 홈, 알 수 없으면 null
function segmentsToScreen(path: string): RouteScreen | null {
  const segs = path
    .split('/')
    .map((s) => s.trim().toLowerCase())
    .filter((s) => s && s !== APP_NAME && s !== 'index.html')
  if (segs.length === 0) return 'input'
  return SEGMENTS[segs[segs.length - 1]] ?? null
}

// 경로를 화면으로. base 접두어를 떼고 해석한다(대소문자, 앞뒤 슬래시, 앱 이름 접두어, index.html 허용)
// 해석할 수 없는 경로는 null(호출하는 쪽에서 홈으로 교정)
export function pathToScreen(pathname: string, base: string): RouteScreen | null {
  const root = trimBase(base).toLowerCase()
  const lower = pathname.toLowerCase()
  const rest = root && (lower === root || lower.startsWith(`${root}/`)) ? pathname.slice(root.length) : pathname
  return segmentsToScreen(rest)
}

// 경로, 해시(#/tarot), 쿼리(?page=tarot) 순서로 화면을 찾는다. 경로가 홈이거나 해석되지 않을 때만 다음 단서를 본다
export function resolveRoute(loc: { pathname: string; hash: string; search: string }, base: string): RouteScreen {
  const fromPath = pathToScreen(loc.pathname, base)
  if (fromPath && fromPath !== 'input') return fromPath
  const hash = loc.hash.replace(/^#!?/, '')
  if (hash) {
    const fromHash = segmentsToScreen(hash.split('?')[0])
    if (fromHash && fromHash !== 'input') return fromHash
  }
  const page = new URLSearchParams(loc.search).get(PAGE_PARAM)
  if (page) {
    const fromQuery = segmentsToScreen(page)
    if (fromQuery && fromQuery !== 'input') return fromQuery
  }
  return 'input'
}

// 교정할 때 남길 쿼리. 화면 지정 키만 지운다(debug 등 나머지는 유지)
export function canonicalSearch(search: string): string {
  const params = new URLSearchParams(search)
  params.delete(PAGE_PARAM)
  const s = params.toString()
  return s ? `?${s}` : ''
}

// 화면을 base가 붙은 경로로
export function screenToPath(screen: RouteScreen, base: string): string {
  const p = PATHS[screen]
  return p === '/' ? `${trimBase(base)}/` : `${trimBase(base)}${p}`
}
