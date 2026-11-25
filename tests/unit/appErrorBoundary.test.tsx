// @vitest-environment happy-dom
// AppErrorBoundary: 렌더 오류 시 안내 화면, 다시 시도로 복구, 반복 실패 시 새로고침
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { DISCLAIMER, ERROR_COPY } from '../../src/core/copy.ts'
import { AppErrorBoundary } from '../../src/screens/AppErrorBoundary.tsx'

const SECRET = '내부 오류 원문'
let shouldThrow = true

function Flaky() {
  if (shouldThrow) throw new Error(SECRET)
  return <p>정상 화면</p>
}

beforeEach(() => {
  shouldThrow = true
  // React가 남기는 오류 로그는 테스트 출력에서 숨김
  vi.spyOn(console, 'error').mockImplementation(() => {})
})
afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

describe('AppErrorBoundary', () => {
  it('정상이면 자식을 그대로 렌더', () => {
    shouldThrow = false
    render(<AppErrorBoundary><Flaky /></AppErrorBoundary>)
    expect(screen.getByText('정상 화면')).toBeTruthy()
    expect(screen.queryByRole('alert')).toBeNull()
  })

  it('렌더 오류면 안내 화면, 다시 시도 버튼, 고정 면책 문구. 오류 원문은 없음', () => {
    const { container } = render(<AppErrorBoundary><Flaky /></AppErrorBoundary>)
    expect(screen.getByRole('alert')).toBeTruthy()
    expect(screen.getByRole('heading', { name: ERROR_COPY.title })).toBeTruthy()
    expect(screen.getByRole('button', { name: ERROR_COPY.retry })).toBeTruthy()
    expect(screen.getByText(DISCLAIMER)).toBeTruthy()
    expect(container.textContent).not.toContain(SECRET)
  })

  it('다시 시도하면 복구된 자식을 렌더', () => {
    render(<AppErrorBoundary><Flaky /></AppErrorBoundary>)
    shouldThrow = false
    fireEvent.click(screen.getByRole('button', { name: ERROR_COPY.retry }))
    expect(screen.getByText('정상 화면')).toBeTruthy()
    expect(screen.queryByRole('alert')).toBeNull()
  })

  it('다시 시도 직후 또 실패하면 다음 다시 시도는 새로고침', () => {
    const reload = vi.fn()
    render(<AppErrorBoundary onReload={reload}><Flaky /></AppErrorBoundary>)
    fireEvent.click(screen.getByRole('button', { name: ERROR_COPY.retry }))
    expect(screen.getByRole('alert')).toBeTruthy()
    expect(reload).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: ERROR_COPY.retry }))
    expect(reload).toHaveBeenCalledTimes(1)
  })
})
