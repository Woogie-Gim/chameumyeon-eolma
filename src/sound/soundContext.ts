// 효과음 컨텍스트. 기본값은 무음이라 단독 렌더와 테스트에서도 안전하다
import { createContext, useContext } from 'react'
import { noopSound, type SoundPlayer } from './sound.ts'

export const SoundContext = createContext<SoundPlayer>(noopSound)

export function useSound(): SoundPlayer {
  return useContext(SoundContext)
}
