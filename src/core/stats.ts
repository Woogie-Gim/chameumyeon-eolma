// 기록 통계 순수 함수

export type Choice = 'saved' | 'spent'
export type LogRecord = { date: string; itemId: string; amount: number; choice: Choice }

const pad = (n: number) => String(n).padStart(2, '0')

// 로컬 날짜 키
export function toDateKey(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

function addDays(d: Date, n: number): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n)
}

// 참았어요 누적 금액
export function totalSaved(records: LogRecord[]): number {
  return records.reduce((s, r) => (r.choice === 'saved' ? s + r.amount : s), 0)
}

// 참았어요가 있는 날의 연속 일수. 오늘 기록이 없으면 어제부터 센다
export function streakDays(records: LogRecord[], today: Date): number {
  const days = new Set(records.filter((r) => r.choice === 'saved').map((r) => r.date))
  let cursor = days.has(toDateKey(today)) ? today : addDays(today, -1)
  let n = 0
  while (days.has(toDateKey(cursor))) {
    n++
    cursor = addDays(cursor, -1)
  }
  return n
}

// 최근 7일 참았어요 금액. 오래된 날부터
export function weeklySaved(records: LogRecord[], today: Date): { date: string; amount: number }[] {
  const out: { date: string; amount: number }[] = []
  for (let i = 6; i >= 0; i--) {
    const key = toDateKey(addDays(today, -i))
    const amount = records.filter((r) => r.choice === 'saved' && r.date === key).reduce((s, r) => s + r.amount, 0)
    out.push({ date: key, amount })
  }
  return out
}
