// 입력 정규화와 해시. 입력 필터와 블록리스트 생성 스크립트가 공유

// 소문자, 한글과 영숫자만 남김
export function normalize(s: string): string {
  return s.normalize('NFC').toLowerCase().replace(/[^가-힣a-z0-9]/g, '')
}

// 32비트 fnv-1a, 소문자 hex 8자리
export function hashTerm(s: string): string {
  let h = 0x811c9dc5
  for (const ch of s) {
    const code = ch.codePointAt(0) as number
    h ^= code
    h = Math.imul(h, 0x01000193) >>> 0
  }
  return h.toString(16).padStart(8, '0')
}
