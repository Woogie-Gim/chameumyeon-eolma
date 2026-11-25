// 숫자 카운트업 훅. 처음은 0부터, 이후 변경은 직전 표시값부터. 동작 줄이기면 즉시 목표값
import { useEffect, useRef, useState } from 'react'
import { COUNT_UP_CHANGE_MS, COUNT_UP_FIRST_MS, countUpAt } from '../core/countUp.ts'
import { prefersReducedMotion } from '../core/fallback.ts'

const reduced = () =>
  prefersReducedMotion(typeof window !== 'undefined' && window.matchMedia ? (q) => window.matchMedia(q) : undefined)

export function useCountUp(target: number): number {
  const [shown, setShown] = useState(() => (reduced() ? target : 0))
  const shownRef = useRef(shown)
  const first = useRef(true)

  useEffect(() => {
    const duration = first.current ? COUNT_UP_FIRST_MS : COUNT_UP_CHANGE_MS
    first.current = false
    const from = shownRef.current
    if (reduced() || typeof requestAnimationFrame === 'undefined' || from === target) {
      shownRef.current = target
      setShown(target)
      return
    }
    let raf = 0
    const start = performance.now()
    const step = (now: number) => {
      const v = countUpAt(from, target, (now - start) / duration)
      shownRef.current = v
      setShown(v)
      if (v !== target) raf = requestAnimationFrame(step)
    }
    raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
  }, [target])

  return shown
}
