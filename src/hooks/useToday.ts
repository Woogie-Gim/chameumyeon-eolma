// 오늘 날짜 상태. 초기화 시점에 한 번 읽고, 앱이 다시 보이거나 포커스될 때 날짜가 바뀌었으면 갱신
import { useEffect, useState } from 'react'
import { nextToday } from '../core/today.ts'

export function useToday(): Date {
  const [today, setToday] = useState(() => new Date())

  useEffect(() => {
    const refresh = () => {
      if (document.visibilityState === 'visible') setToday((prev) => nextToday(prev, new Date()))
    }
    document.addEventListener('visibilitychange', refresh)
    window.addEventListener('focus', refresh)
    return () => {
      document.removeEventListener('visibilitychange', refresh)
      window.removeEventListener('focus', refresh)
    }
  }, [])

  return today
}
