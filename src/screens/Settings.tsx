// 설정 화면. 이율은 rates.json 범위 안에서만 조정
import { useState } from 'react'
import { DISCLAIMER, ETF_DISCLAIMER, STORAGE_MEMORY_NOTICE } from '../core/copy.ts'
import rates from '../data/rates.json' with { type: 'json' }
import returns from '../data/returns.json' with { type: 'json' }
import type { Settings as SettingsValue } from '../store/storage.ts'

type Props = { settings: SettingsValue; persistent: boolean; onChange: (s: SettingsValue) => void; onReset: () => void; onOpenGuide: () => void }

function RateSlider({ id, label, value, min, max, onChange }: { id: string; label: string; value: number; min: number; max: number; onChange: (v: number) => void }) {
  return (
    <div>
      <div className="slider-head">
        <label className="section-label" htmlFor={id}>{label}</label>
        <strong>연 {value.toFixed(2)}%</strong>
      </div>
      <input id={id} className="slider" type="range" min={min} max={max} step={0.01} value={value} onChange={(e) => onChange(Number(e.target.value))} />
      <p className="meta">범위 {min.toFixed(2)}% ~ {max.toFixed(2)}%</p>
    </div>
  )
}

export function Settings({ settings, persistent, onChange, onReset, onOpenGuide }: Props) {
  const [confirming, setConfirming] = useState(false)
  const [done, setDone] = useState(false)

  function reset() {
    if (!confirming) {
      setConfirming(true)
      setDone(false)
      return
    }
    onReset()
    setConfirming(false)
    setDone(true)
  }

  return (
    <section className="screen" aria-labelledby="settings-title">
      <h1 id="settings-title" className="screen-title">설정</h1>

      <div className="card">
        <p className="section-label">기본 가정 이율</p>
        <RateSlider id="deposit-rate" label="예금형" value={settings.depositRate} min={rates.deposit.min} max={rates.deposit.max} onChange={(v) => onChange({ ...settings, depositRate: v })} />
        <RateSlider id="savings-rate" label="적금형" value={settings.savingsRate} min={rates.savings.min} max={rates.savings.max} onChange={(v) => onChange({ ...settings, savingsRate: v })} />
      </div>

      <div className="card">
        <p className="section-label">데이터</p>
        <p className="meta">공개 통계 기반 가정값입니다.</p>
        <p className="meta">이율 기준 {rates.asOf} · 상승률 기준 {returns.asOf}</p>
        {!persistent && (
          <p className="notice notice-other" role="status" data-testid="storage-notice">{STORAGE_MEMORY_NOTICE}</p>
        )}
        <button type="button" className="btn btn-block" style={{ marginTop: 'var(--space-3)' }} onClick={onOpenGuide}>
          이용 안내
        </button>
      </div>

      <div className="card">
        <div className="setting-row">
          <label htmlFor="reduce3d">저사양 3D 끄기</label>
          <input id="reduce3d" className="switch" type="checkbox" checked={settings.reduce3d} onChange={(e) => onChange({ ...settings, reduce3d: e.target.checked })} />
        </div>
        <p className="meta">켜면 저금통 연출을 2D 그래픽으로 보여 줘요. 동작 줄이기 설정이 켜진 기기와 3D를 지원하지 않는 기기도 2D로 보여요.</p>
      </div>

      <div className="card">
        <button type="button" className="btn btn-block btn-danger" onClick={reset}>
          {confirming ? '한 번 더 누르면 모든 기록과 설정이 지워져요' : '데이터 초기화'}
        </button>
        {done && <p className="notice notice-ok" role="status">초기화했어요.</p>}
      </div>

      <p className="disclaimer">{DISCLAIMER}</p>
      <p className="disclaimer">{ETF_DISCLAIMER}</p>
    </section>
  )
}
