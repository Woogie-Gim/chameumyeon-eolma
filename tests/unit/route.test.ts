// 경로와 화면 매핑. 루트 배포(앱인토스)와 하위 경로 배포(GitHub Pages) 모두
// 앱인토스 웹뷰가 주는 pathname 형태가 가이드에 없어 변형(앱 이름 접두어, 끝 슬래시, 대소문자, index.html)을 허용한다
import { describe, expect, it } from 'vitest'
import { canonicalSearch, pathToScreen, resolveRoute, screenToPath } from '../../src/core/route.ts'

const loc = (pathname: string, hash = '', search = '') => ({ pathname, hash, search })

describe.each([
  ['루트', '/'],
  ['하위 경로', '/chameumyeon-eolma/'],
])('경로 매핑 (%s)', (_, base) => {
  const root = base.replace(/\/$/, '')

  it('주요 기능 경로를 화면으로', () => {
    expect(pathToScreen(`${root}/`, base)).toBe('input')
    expect(pathToScreen(`${root}/tarot`, base)).toBe('tarot')
    expect(pathToScreen(`${root}/record`, base)).toBe('log')
    expect(pathToScreen(`${root}/settings`, base)).toBe('settings')
    expect(pathToScreen(`${root}/info`, base)).toBe('guide')
  })

  it.each([
    ['끝 슬래시', '/tarot/'],
    ['겹친 슬래시', '//tarot//'],
    ['대소문자', '/Tarot'],
    ['대문자', '/TAROT'],
    ['앱 이름 접두어', '/chameumyeon-eolma/tarot'],
    ['앱 이름 접두어 대소문자', '/Chameumyeon-Eolma/tarot/'],
    ['index.html 뒤', '/index.html/tarot'],
    ['index.html 끝', '/tarot/index.html'],
    ['앱 이름과 index.html', '/chameumyeon-eolma/index.html/tarot'],
  ])('변형 허용: %s (%s)', (_, path) => {
    expect(pathToScreen(`${root}${path}`, base)).toBe('tarot')
  })

  it('홈 변형', () => {
    for (const p of ['', '/', '/index.html', '/chameumyeon-eolma', '/chameumyeon-eolma/', '/chameumyeon-eolma/index.html']) {
      expect(pathToScreen(`${root}${p}`, base), p || '(빈 경로)').toBe('input')
    }
  })

  it('없는 경로와 결과 경로는 null(홈으로 교정)', () => {
    expect(pathToScreen(`${root}/result`, base)).toBeNull()
    expect(pathToScreen(`${root}/some/deep/link`, base)).toBeNull()
    // 마지막 세그먼트로 판단하므로 뒤에 다른 세그먼트가 붙으면 없는 경로
    expect(pathToScreen(`${root}/tarot/extra`, base)).toBeNull()
  })

  it('화면을 base가 붙은 경로로', () => {
    expect(screenToPath('input', base)).toBe(`${root}/`)
    expect(screenToPath('tarot', base)).toBe(`${root}/tarot`)
    expect(screenToPath('log', base)).toBe(`${root}/record`)
    expect(screenToPath('guide', base)).toBe(`${root}/info`)
  })

  it('정규 경로는 다시 해석해도 같은 화면', () => {
    for (const s of ['input', 'tarot', 'log', 'settings', 'guide'] as const) {
      expect(pathToScreen(screenToPath(s, base), base)).toBe(s)
    }
  })
})

describe('해시와 쿼리 대체 단서', () => {
  it('경로가 홈이면 해시로', () => {
    expect(resolveRoute(loc('/', '#/record'), '/')).toBe('log')
    expect(resolveRoute(loc('/', '#record'), '/')).toBe('log')
    expect(resolveRoute(loc('/', '#!/tarot'), '/')).toBe('tarot')
    expect(resolveRoute(loc('/chameumyeon-eolma/', '#/Tarot/'), '/chameumyeon-eolma/')).toBe('tarot')
  })

  it('경로와 해시가 없으면 쿼리 page로', () => {
    expect(resolveRoute(loc('/', '', '?page=tarot'), '/')).toBe('tarot')
    expect(resolveRoute(loc('/', '', '?referrer=x&page=RECORD'), '/')).toBe('log')
  })

  it('경로가 해석되면 경로가 우선', () => {
    expect(resolveRoute(loc('/tarot', '#/record', '?page=info'), '/')).toBe('tarot')
  })

  it('해석되지 않는 경로도 해시나 쿼리가 있으면 그 화면', () => {
    expect(resolveRoute(loc('/unknown', '#/record'), '/')).toBe('log')
  })

  it('아무 단서도 없거나 모르는 값이면 홈', () => {
    expect(resolveRoute(loc('/'), '/')).toBe('input')
    expect(resolveRoute(loc('/no/such', '#/nothing', '?page=result'), '/')).toBe('input')
  })

  it('교정 시 page만 지우고 나머지 쿼리는 유지', () => {
    expect(canonicalSearch('?page=tarot')).toBe('')
    expect(canonicalSearch('?referrer=home&page=tarot')).toBe('?referrer=home')
    expect(canonicalSearch('?referrer=home')).toBe('?referrer=home')
    expect(canonicalSearch('')).toBe('')
  })
})

it('하위 경로 배포에서 base 밖 경로도 마지막 세그먼트로 해석', () => {
  expect(pathToScreen('/tarot', '/chameumyeon-eolma/')).toBe('tarot')
  expect(pathToScreen('/chameumyeon-eolma', '/chameumyeon-eolma/')).toBe('input')
  expect(pathToScreen('/CHAMEUMYEON-EOLMA/record', '/chameumyeon-eolma/')).toBe('log')
})
