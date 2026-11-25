// PNG 픽셀 크기 읽기(IHDR). 스토어 자산 규격 검사용
import { readFileSync } from 'node:fs'

const SIGNATURE = '89504e470d0a1a0a'

export function pngSize(source: string | Buffer): { width: number; height: number } {
  const buf = typeof source === 'string' ? readFileSync(source) : source
  if (buf.subarray(0, 8).toString('hex') !== SIGNATURE) throw new Error('PNG 파일이 아님')
  return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) }
}

// 크기가 다르면 예외
export function assertPngSize(source: string | Buffer, width: number, height: number, label = 'PNG') {
  const s = pngSize(source)
  if (s.width !== width || s.height !== height) throw new Error(`${label} 크기 ${s.width}x${s.height}, 기대값 ${width}x${height}`)
}
