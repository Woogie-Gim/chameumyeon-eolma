// storage.ts 단위 테스트. 메모리 저장소 주입
import { describe, expect, it } from 'vitest'
import { createStore, type KeyValue } from '../../src/store/storage.ts'
import rates from '../../src/data/rates.json' with { type: 'json' }

function memory(): KeyValue & { dump: () => string } {
  const m = new Map<string, string>()
  return {
    getItem: (k) => m.get(k) ?? null,
    setItem: (k, v) => void m.set(k, v),
    removeItem: (k) => void m.delete(k),
    dump: () => [...m.values()].join('\n'),
  }
}

describe('store', () => {
  it('기본 설정은 rates default', () => {
    const s = createStore(memory())
    expect(s.getSettings()).toEqual({ depositRate: rates.deposit.default, savingsRate: rates.savings.default, reduce3d: false, sound: true })
  })

  it('효과음 설정 저장과 복원, 잘못된 값은 기본값(켜짐)', () => {
    const kv = memory()
    const s = createStore(kv)
    s.saveSettings({ ...s.getSettings(), sound: false })
    expect(createStore(kv).getSettings().sound).toBe(false)
    kv.setItem('chameum.settings.v1', JSON.stringify({ sound: 'yes' }))
    expect(createStore(kv).getSettings().sound).toBe(true)
  })

  it('기록 추가와 조회, 허용 필드만 저장', () => {
    const kv = memory()
    const s = createStore(kv)
    s.addRecord({ date: '2026-11-23', itemId: 'chicken', amount: 18000, choice: 'saved', raw: '원문' } as never)
    expect(s.getRecords()).toEqual([{ date: '2026-11-23', itemId: 'chicken', amount: 18000, choice: 'saved' }])
    expect(kv.dump()).not.toContain('원문')
  })

  it('이율은 min~max로 보정', () => {
    const s = createStore(memory())
    s.saveSettings({ depositRate: 99, savingsRate: -1, reduce3d: true, sound: false })
    expect(s.getSettings()).toEqual({ depositRate: rates.deposit.max, savingsRate: rates.savings.min, reduce3d: true, sound: false })
  })

  it('손상된 데이터는 기본값', () => {
    const kv = memory()
    kv.setItem('chameum.records.v1', '{broken')
    kv.setItem('chameum.settings.v1', 'null')
    const s = createStore(kv)
    expect(s.getRecords()).toEqual([])
    expect(s.getSettings().depositRate).toBe(rates.deposit.default)
  })

  it('잘못된 기록 항목은 걸러냄', () => {
    const kv = memory()
    kv.setItem('chameum.records.v1', JSON.stringify([{ date: 'x' }, { date: '2026-11-23', itemId: 'coffee', amount: 4500, choice: 'spent' }]))
    expect(createStore(kv).getRecords()).toHaveLength(1)
  })

  it('저장소 오류에도 동작', () => {
    const s = createStore({
      getItem: () => { throw new Error('blocked') },
      setItem: () => { throw new Error('blocked') },
      removeItem: () => { throw new Error('blocked') },
    })
    expect(s.getRecords()).toEqual([])
    expect(() => s.addRecord({ date: '2026-11-23', itemId: 'coffee', amount: 1, choice: 'saved' })).not.toThrow()
    expect(() => s.resetAll()).not.toThrow()
  })

  it('초기화', () => {
    const s = createStore(memory())
    s.addRecord({ date: '2026-11-23', itemId: 'coffee', amount: 1, choice: 'saved' })
    s.resetAll()
    expect(s.getRecords()).toEqual([])
  })
})

describe('store 타로', () => {
  it('날짜와 카드 id만 저장', () => {
    const kv = memory()
    const s = createStore(kv)
    s.saveTarot({ date: '2026-11-25', cardId: 7, name: '카드 이름', extra: 1 } as never)
    expect(s.getTarot()).toEqual({ date: '2026-11-25', cardId: 7 })
    expect(JSON.parse(kv.getItem('chameum.tarot.v1')!)).toEqual({ date: '2026-11-25', cardId: 7 })
    expect(kv.dump()).not.toContain('카드 이름')
  })

  it('다시 저장하면 덮어쓰고 누적하지 않는다', () => {
    const kv = memory()
    const s = createStore(kv)
    s.saveTarot({ date: '2026-11-24', cardId: 1 })
    s.saveTarot({ date: '2026-11-25', cardId: 2 })
    expect(s.getTarot()).toEqual({ date: '2026-11-25', cardId: 2 })
    expect(kv.dump()).not.toContain('2026-11-24')
  })

  it('잘못된 값은 저장하지 않고 읽지 않는다', () => {
    const kv = memory()
    const s = createStore(kv)
    s.saveTarot({ date: '어제', cardId: 1 })
    s.saveTarot({ date: '2026-11-25', cardId: 22 })
    expect(s.getTarot()).toBeNull()
    kv.setItem('chameum.tarot.v1', '{"date":"2026-11-25","cardId":-1}')
    expect(s.getTarot()).toBeNull()
    kv.setItem('chameum.tarot.v1', 'not json')
    expect(s.getTarot()).toBeNull()
  })

  it('초기화하면 타로도 지운다', () => {
    const s = createStore(memory())
    s.saveTarot({ date: '2026-11-25', cardId: 3 })
    s.resetAll()
    expect(s.getTarot()).toBeNull()
  })
})

describe('저장소를 쓸 수 없을 때 메모리 대체', () => {
  const rec = { date: '2026-11-25', itemId: 'coffee', amount: 4500, choice: 'saved' as const }
  const quota = () => {
    const e = new Error('QuotaExceededError')
    e.name = 'QuotaExceededError'
    throw e
  }

  it('저장소 없음(null): 같은 세션에서는 기록과 설정과 타로가 유지된다', () => {
    const s = createStore(null)
    expect(s.isPersistent()).toBe(false)
    s.addRecord(rec)
    s.saveSettings({ ...s.getSettings(), reduce3d: true })
    s.saveTarot({ date: '2026-11-25', cardId: 4 })
    expect(s.getRecords()).toEqual([rec])
    expect(s.getSettings().reduce3d).toBe(true)
    expect(s.getTarot()).toEqual({ date: '2026-11-25', cardId: 4 })
  })

  it('용량 초과(setItem 예외): 메모리로 계속 동작하고 비영속으로 표시', () => {
    const kv = memory()
    const s = createStore({ ...kv, setItem: quota })
    expect(s.isPersistent()).toBe(false)
    s.addRecord(rec)
    s.addRecord({ ...rec, amount: 1000 })
    expect(s.getRecords()).toHaveLength(2)
  })

  it('읽기 차단(getItem 예외)', () => {
    const s = createStore({ getItem: () => { throw new Error('SecurityError') }, setItem: () => {}, removeItem: () => {} })
    expect(s.getRecords()).toEqual([])
    s.addRecord(rec)
    expect(s.getRecords()).toEqual([rec])
    expect(s.isPersistent()).toBe(false)
  })

  it('정상 저장소면 영속이고 실제 저장소에 쓴다', () => {
    const kv = memory()
    const s = createStore(kv)
    expect(s.isPersistent()).toBe(true)
    s.addRecord(rec)
    expect(createStore(kv).getRecords()).toEqual([rec])
    expect(kv.getItem('chameum.probe')).toBeNull()
  })

  it('초기화 후 메모리 사본도 비워진다', () => {
    const s = createStore(null)
    s.addRecord(rec)
    s.resetAll()
    expect(s.getRecords()).toEqual([])
  })
})
