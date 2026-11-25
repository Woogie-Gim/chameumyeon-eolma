// scan-banned.ts 단위 테스트. 티커 의심 규칙은 화면 문자열과 데이터 JSON에만 적용
import { describe, expect, it } from 'vitest'
import { scanFile, visibleStrings } from '../../scripts/scan-banned.ts'

const allow = new Set(['ETF'])
const banned = ['금지상품']
const tickers = (src: string, file: string) => scanFile(src, file, allow, banned).filter((v) => v.kind === '티커 의심').map((v) => v.match)

describe('티커 의심: 코드 식별자와 주석은 통과', () => {
  it('대문자 상수, 타입, 주석', () => {
    const src = [
      '// CSS 전환과 FNV 해시, YYYY-MM-DD',
      '/* WebGL PI ARM */',
      'const ARM = 1.3',
      'const HANG = Math.PI / 2',
      'type RGB = { r: number }',
      'export function DEPTH(): number { return ARM }',
    ].join('\n')
    expect(tickers(src, 'src/scenes/a.ts')).toEqual([])
  })

  it('JSX 컴포넌트 이름과 속성 이름', () => {
    const src = 'const UI = () => <SVG viewBox="0 0 1 1"><ABC /></SVG>'
    expect(tickers(src, 'src/screens/a.tsx')).toEqual([])
  })

  it('모듈 경로 문자열은 제외', () => {
    expect(tickers("import x from './ABCD.ts'\nexport { y } from './QWER.ts'", 'src/a.ts')).toEqual([])
  })

  it('CSS 파일은 티커 검사 대상이 아님', () => {
    expect(tickers('/* RGB */ .a { color: RED; }', 'src/styles/a.css')).toEqual([])
  })
})

describe('티커 의심: 화면 문자열과 JSON은 실패', () => {
  it('문자열 리터럴', () => {
    expect(tickers("const label = '기술주 QQQ형'", 'src/core/a.ts')).toEqual(['QQQ'])
  })

  it('템플릿 문자열의 문자 부분', () => {
    expect(tickers('const t = `${x} ABCD 상승률 ${y}`', 'src/core/a.ts')).toEqual(['ABCD'])
  })

  it('JSX 텍스트와 JSX 속성 문자열', () => {
    const src = 'const A = () => <p aria-label="XYZ 비교">오늘 SPYX 상승</p>'
    expect(tickers(src, 'src/screens/a.tsx').sort()).toEqual(['SPYX', 'XYZ'])
  })

  it('src/data/*.json 전체', () => {
    expect(tickers('{ "label": "대형주 VOO형" }', 'src/data/returns.json')).toEqual(['VOO'])
  })

  it('허용 목록은 문자열 안에서도 통과', () => {
    expect(tickers("const s = '기술주 ETF형'", 'src/core/a.ts')).toEqual([])
  })

  it('위치는 원본 줄 번호', () => {
    const src = "const a = 1\n// 주석\nconst s = `첫 줄\n둘째 QQQ`"
    const v = scanFile(src, 'src/core/a.ts', allow, banned)
    expect(v).toEqual([{ file: 'src/core/a.ts', line: 4, kind: '티커 의심', match: 'QQQ' }])
  })
})

describe('권유 표현과 금지 상품명은 src 전체에 적용', () => {
  it('주석과 식별자에서도 실패', () => {
    const v = scanFile('// 지금 사세요\nconst 금지상품 = 1', 'src/core/a.ts', allow, banned)
    expect(v.map((x) => x.kind).sort()).toEqual(['권유 표현', '금지 상품명'])
  })

  it('CSS 주석에서도 실패', () => {
    expect(scanFile('/* 매수 */', 'src/styles/a.css', allow, banned).map((x) => x.kind)).toEqual(['권유 표현'])
  })
})

describe('visibleStrings', () => {
  it('문자열, 템플릿, JSX 텍스트를 줄 번호와 함께 반환', () => {
    const src = "const a = '하나'\nconst b = `둘${a}셋`\nconst C = () => <b>넷</b>"
    expect(visibleStrings(src, 'x.tsx').map((s) => [s.text, s.line])).toEqual([
      ['하나', 1],
      ['둘', 2],
      ['셋', 2],
      ['넷', 3],
    ])
  })
})
