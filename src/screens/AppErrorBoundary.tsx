// 앱 전체 에러 경계. 렌더 오류 시 안내 화면과 다시 시도 버튼. 오류 원문은 화면에 표시하지 않는다
// 다시 시도는 먼저 다시 렌더하고, 다시 시도 직후(3초 안) 또 실패하면 페이지를 새로 불러온다
import { Component, type ReactNode } from 'react'
import { DISCLAIMER, ERROR_COPY } from '../core/copy.ts'

const REPEAT_WINDOW_MS = 3000

type Props = { children: ReactNode; onReload?: () => void }
type State = { failed: boolean; repeated: boolean }

export class AppErrorBoundary extends Component<Props, State> {
  state: State = { failed: false, repeated: false }
  private retriedAt = 0

  static getDerivedStateFromError(): Partial<State> {
    return { failed: true }
  }

  componentDidCatch() {
    if (this.retriedAt && Date.now() - this.retriedAt < REPEAT_WINDOW_MS) this.setState({ repeated: true })
  }

  retry = () => {
    if (this.state.repeated) {
      ;(this.props.onReload ?? (() => window.location.reload()))()
      return
    }
    this.retriedAt = Date.now()
    this.setState({ failed: false })
  }

  render() {
    if (!this.state.failed) return this.props.children
    return (
      <main className="app">
        <section className="screen" role="alert" aria-labelledby="error-title">
          <h1 id="error-title" className="screen-title">{ERROR_COPY.title}</h1>
          <div className="card">
            <p className="meta">{ERROR_COPY.body}</p>
          </div>
          <button type="button" className="btn btn-primary btn-block" onClick={this.retry}>{ERROR_COPY.retry}</button>
          <p className="disclaimer">{DISCLAIMER}</p>
        </section>
      </main>
    )
  }
}
