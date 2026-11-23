// 앱 셸. 라우터 없이 상태로 화면 전환
import { useState } from 'react'
import { toDateKey, type Choice as ChoiceValue, type LogRecord } from './core/stats.ts'
import { Choice } from './screens/Choice.tsx'
import { Input } from './screens/Input.tsx'
import { Log } from './screens/Log.tsx'
import { Result } from './screens/Result.tsx'
import { Settings } from './screens/Settings.tsx'
import type { Draft } from './screens/types.ts'
import { store, type Settings as SettingsValue } from './store/storage.ts'

type Screen = 'input' | 'result' | 'choice' | 'log' | 'settings'
type Tab = 'input' | 'log' | 'settings'

const TAB_ITEMS: { id: Tab; label: string }[] = [
  { id: 'input', label: '입력' },
  { id: 'log', label: '기록' },
  { id: 'settings', label: '설정' },
]

function App() {
  const [screen, setScreen] = useState<Screen>('input')
  const [draft, setDraft] = useState<Draft | null>(null)
  const [settings, setSettings] = useState<SettingsValue>(() => store.getSettings())
  const [records, setRecords] = useState<LogRecord[]>(() => store.getRecords())

  const activeTab: Tab = screen === 'log' || screen === 'settings' ? screen : 'input'

  function choose(c: ChoiceValue) {
    if (!draft) return
    store.addRecord({ date: toDateKey(new Date()), itemId: draft.itemId, amount: draft.amount, choice: c })
    setRecords(store.getRecords())
    setDraft(null)
    setScreen('log')
  }

  function changeSettings(s: SettingsValue) {
    store.saveSettings(s)
    setSettings(store.getSettings())
  }

  function reset() {
    store.resetAll()
    setSettings(store.getSettings())
    setRecords([])
    setDraft(null)
  }

  return (
    <>
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
        {screen === 'log' && <Log records={records} today={new Date()} />}
        {screen === 'settings' && <Settings settings={settings} onChange={changeSettings} onReset={reset} />}
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
              {t.label}
            </button>
          ))}
        </div>
      </nav>
    </>
  )
}

export default App
