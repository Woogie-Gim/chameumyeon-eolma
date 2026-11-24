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
    expect(s.getSettings()).toEqual({ depositRate: rates.deposit.default, savingsRate: rates.savings.default, reduce3d: false })
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
    s.saveSettings({ depositRate: 99, savingsRate: -1, reduce3d: true })
    expect(s.getSettings()).toEqual({ depositRate: rates.deposit.max, savingsRate: rates.savings.min, reduce3d: true })
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
