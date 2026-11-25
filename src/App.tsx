// 앱 셸. 라우터 없이 상태로 화면 전환
import { useEffect, useMemo, useState } from 'react'
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

function App() {
  const [screen, setScreen] = useState<Screen>('input')
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

  // 화면이 바뀌면 맨 위부터 보여 준다
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [screen])

  function openGuide() {
    if (screen !== 'guide') setGuideFrom(screen)
    setScreen('guide')
  }

  function choose(c: ChoiceValue) {
    if (!draft) return
    store.addRecord({ date: toDateKey(new Date()), itemId: draft.itemId, amount: draft.amount, choice: c })
    setRecords(store.getRecords())
    setDraft(null)
    setScreen('log')
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
              setScreen('result')
            }}
          />
        )}
        {screen === 'result' && draft && (
          <Result draft={draft} settings={settings} onNext={() => setScreen('choice')} onBack={() => setScreen('input')} />
        )}
        {screen === 'choice' && draft && <Choice draft={draft} onChoose={choose} />}
        {screen === 'log' && <Log records={records} today={today} />}
        {screen === 'tarot' && <Tarot todayKey={toDateKey(today)} reduce3d={settings.reduce3d} />}
        {screen === 'settings' && (
          <Settings settings={settings} persistent={store.isPersistent()} onChange={changeSettings} onReset={reset} onOpenGuide={openGuide} />
        )}
        {screen === 'guide' && <Guide onBack={() => setScreen(guideFrom)} />}
      </main>
      <nav className="tabbar" aria-label="화면 이동">
        <div className="tabbar-inner">
          {TAB_ITEMS.map((t) => (
            <button
              key={t.id}
              type="button"
              className="tab"
              aria-current={activeTab === t.id ? 'page' : undefined}
              onClick={() => setScreen(t.id === 'input' && draft ? 'input' : t.id)}
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
