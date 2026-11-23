// banned-terms.txt를 해시로 변환해 src/data/blockedHashes.json 생성
// src에는 금칙어 원문을 두지 않는다
import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { hashTerm, normalize } from '../src/core/textNorm.ts'

const ROOT = resolve(import.meta.dirname, '..')
const terms = readFileSync(resolve(ROOT, 'scripts/banned-terms.txt'), 'utf8')
  .split(/\r?\n/)
  .map((l) => l.trim())
  .filter((l) => l && !l.startsWith('#'))

const normalized = terms.map(normalize).filter((t) => t.length > 0)
const hashes = [...new Set(normalized.map(hashTerm))].sort()
const maxLen = Math.max(...normalized.map((t) => [...t].length))

writeFileSync(
  resolve(ROOT, 'src/data/blockedHashes.json'),
  JSON.stringify({ maxLen, hashes }, null, 2) + '\n',
)
console.log(`금칙어 ${terms.length}개 → 해시 ${hashes.length}개, 최대 길이 ${maxLen}`)
