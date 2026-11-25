// 오늘 날짜 갱신 판정. 날짜 키가 같으면 이전 객체를 그대로 돌려 리렌더를 막는다
import { toDateKey } from './stats.ts'

export function nextToday(prev: Date, now: Date): Date {
  return toDateKey(prev) === toDateKey(now) ? prev : now
}
