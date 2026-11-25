// 앱 셸. 라우터 없이 상태로 화면 전환하고 history API로 경로를 맞춘다
import { useEffect, useMemo, useRef, useState } from 'react'
import { canonicalSearch, resolveRoute, screenToPath, type RouteScreen } from './core/route.ts'
import { toDateKey, type Choice as ChoiceValue, type LogRecord } from './core/stats.ts'
import { Choice } from './screens/Choice.tsx'
import { Guide } from './screens/Guide.tsx'
import { Input } from './screens/Input.tsx'
import { Log } from './screens/Log.tsx'
import { Result } from './screens/Result.tsx'
import { Settings } from './screens/Settings.tsx'
import { TabIcon } from './screens/TabIcon.tsx'
import { Tarot } from './screens/Tarot.tsx'
import type { Draft } from './screens/types.ts'
import { useToday } from './hooks/useToday.ts'
import { createBrowserSound } from './sound/sound.ts'
import { SoundContext } from './sound/soundContext.ts'
import { store, type Settings as SettingsValue } from './store/storage.ts'

type Screen = 'input' | 'result' | 'choice' | 'log' | 'tarot' | 'settings' | 'guide'
type Tab = 'input' | 'log' | 'tarot' | 'settings'

const TAB_ITEMS: { id: Tab; label: string }[] = [
  { id: 'input', label: '입력' },
  { id: 'log', label: '기록' },
  { id: 'tarot', label: '타로' },
  { id: 'settings', label: '설정' },
]

const SCREENS: Screen[] = ['input', 'result', 'choice', 'log', 'tarot', 'settings', 'guide']
const BASE = import.meta.env.BASE_URL

// history.state에 넣는 값. idx는 앱 안에서 쌓은 항목 수(0이면 뒤로 갈 앱 화면 없음)
type NavState = { screen: Screen; from?: Exclude<Screen, 'guide'>; idx: number }

const isScreen = (v: unknown): v is Screen => typeof v === 'string' && (SCREENS as string[]).includes(v)
// 결과와 선택은 입력과 같은 경로를 쓴다
const routeOf = (s: Screen): RouteScreen => (s === 'result' || s === 'choice' ? 'input' : s)

function readNavState(v: unknown): NavState | null {
  if (!v || typeof v !== 'object') return null
  const o = v as Record<string, unknown>
  if (!isScreen(o.screen) || typeof o.idx !== 'number') return null
  const from = isScreen(o.from) && o.from !== 'guide' ? o.from : undefined
  return { screen: o.screen, from, idx: o.idx }
}

// 처음 진입 화면. 없는 경로는 입력(홈). 결과 경로는 따로 없고 입력값도 없으므로 입력에서 시작
const initialScreen = (): RouteScreen => resolveRoute(window.location, BASE)

function App() {
  const [screen, setScreen] = useState<Screen>(initialScreen)
  const [draft, setDraft] = useState<Draft | null>(null)
  const [settings, setSettings] = useState<SettingsValue>(() => store.getSettings())
  const [records, setRecords] = useState<LogRecord[]>(() => store.getRecords())
  const today = useToday()
  // 안내 화면을 열기 전 화면. 돌아가기에 사용
  const [guideFrom, setGuideFrom] = useState<Exclude<Screen, 'guide'>>('settings')

  const base = screen === 'guide' ? guideFrom : screen
  const activeTab: Tab = base === 'log' || base === 'tarot' || base === 'settings' ? base : 'input'

  // 효과음. 처음 설정값으로 한 번 만들고 이후에는 켜고 끄기만 한다
  const [initialSound] = useState(settings.sound)
  const sound = useMemo(() => createBrowserSound(initialSound), [initialSound])
  useEffect(() => {
    sound.setEnabled(settings.sound)
  }, [sound, settings.sound])

  // 버튼 탭 소리. 화면마다 붙이지 않고 문서 클릭 하나로 처리한다. data-sound="custom" 버튼은 자체 소리를 낸다
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      const btn = e.target instanceof Element ? e.target.closest('button') : null
      if (btn && !btn.disabled && !btn.closest('[data-sound="custom"]')) sound.play('tap')
    }
    document.addEventListener('click', onClick)
    return () => document.removeEventListener('click', onClick)
  }, [sound])

  // 경로 동기화. 진입 시 현재 화면을 정규 경로로 바꿔 적고(없는 경로는 홈), 뒤로가기에 맞춰 화면을 복원한다
  const idxRef = useRef(0)
  const draftRef = useRef(draft)
  useEffect(() => {
    draftRef.current = draft
  }, [draft])
  useEffect(() => {
    const first = initialScreen()
    // 해시와 화면 지정 쿼리는 지우고 정규 경로로 바꿔 적는다
    window.history.replaceState({ screen: first, idx: 0 } satisfies NavState, '', screenToPath(first, BASE) + canonicalSearch(window.location.search))
    const onPop = (e: PopStateEvent) => {
      const st = readNavState(e.state)
      let next: Screen = st?.screen ?? resolveRoute(window.location, BASE)
      // 입력값 없이 결과나 선택으로 돌아오면 입력으로
      if ((next === 'result' || next === 'choice') && !draftRef.current) next = 'input'
      if (next === 'guide') setGuideFrom(st?.from ?? 'settings')
      idxRef.current = st?.idx ?? 0
      setScreen(next)
    }
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [])

  // 화면 이동. 기본은 새 기록을 쌓고, replace면 현재 기록을 바꾼다
  function navigate(next: Screen, opts: { replace?: boolean; from?: Exclude<Screen, 'guide'> } = {}) {
    const idx = opts.replace ? idxRef.current : idxRef.current + 1
    const state: NavState = { screen: next, from: opts.from, idx }
    const url = screenToPath(routeOf(next), BASE)
    if (opts.replace) window.history.replaceState(state, '', url)
    else window.history.pushState(state, '', url)
    idxRef.current = idx
    if (next === 'guide' && opts.from) setGuideFrom(opts.from)
    setScreen(next)
  }

  // 앱 안에서 쌓은 기록이 있으면 뒤로가기, 없으면(딥링크 진입 등) fallback으로 바꿔 적는다
  function goBack(fallback: Screen) {
    if (idxRef.current > 0) window.history.back()
    else navigate(fallback, { replace: true })
  }

  // 화면이 바뀌면 맨 위부터 보여 준다
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [screen])

  function openGuide() {
    if (screen !== 'guide') navigate('guide', { from: screen })
  }

  function choose(c: ChoiceValue) {
    if (!draft) return
    store.addRecord({ date: toDateKey(new Date()), itemId: draft.itemId, amount: draft.amount, choice: c })
    setRecords(store.getRecords())
    setDraft(null)
    navigate('log')
  }

  function changeSettings(s: SettingsValue) {
    store.saveSettings(s)
    const next = store.getSettings()
    setSettings(next)
    // 효과음을 켠 순간 확인용으로 한 번 들려준다
    if (next.sound && !settings.sound) {
      sound.setEnabled(true)
      sound.play('tap')
    }
  }

  function reset() {
    store.resetAll()
    setSettings(store.getSettings())
    setRecords([])
    setDraft(null)
  }

  return (
    <SoundContext.Provider value={sound}>
      {/* 화면별 배경 도형. 장식이므로 보조 기기에서 숨김 */}
      <div className="app-backdrop" data-screen={screen} aria-hidden="true" />
      <header className="app-header">
        <div className="app-header-inner">
          <span className="app-name">참으면 얼마?</span>
          <button type="button" className="header-btn" aria-current={screen === 'guide' ? 'page' : undefined} onClick={openGuide}>
            안내
          </button>
        </div>
      </header>
      <main className="app">
        {screen === 'input' && (
          <Input
            initial={draft}
            onSubmit={(d) => {
              setDraft(d)
              navigate('result')
            }}
          />
        )}
        {screen === 'result' && draft && (
          <Result draft={draft} settings={settings} onNext={() => navigate('choice')} onBack={() => goBack('input')} />
        )}
        {screen === 'choice' && draft && <Choice draft={draft} onChoose={choose} />}
        {screen === 'log' && <Log records={records} today={today} />}
        {screen === 'tarot' && <Tarot todayKey={toDateKey(today)} reduce3d={settings.reduce3d} />}
        {screen === 'settings' && (
          <Settings settings={settings} persistent={store.isPersistent()} onChange={changeSettings} onReset={reset} onOpenGuide={openGuide} />
        )}
        {screen === 'guide' && <Guide onBack={() => goBack(guideFrom)} />}
      </main>
      <nav className="tabbar" aria-label="화면 이동">
        <div className="tabbar-inner">
          {TAB_ITEMS.map((t) => (
            <button
              key={t.id}
              type="button"
              className="tab"
              aria-current={activeTab === t.id ? 'page' : undefined}
              onClick={() => {
                // 같은 탭을 다시 누르면 기록을 쌓지 않는다
                if (screen !== t.id) navigate(t.id)
              }}
            >
              <TabIcon name={t.id} />
              <span className="tab-label">{t.label}</span>
            </button>
          ))}
        </div>
      </nav>
    </SoundContext.Provider>
  )
}

export default App
