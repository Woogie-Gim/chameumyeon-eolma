/// <reference types="vitest/config" />
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  // GitHub Pages 하위 경로 배포용. 미지정 시 루트
  base: process.env.BASE_PATH || '/',
  plugins: [react()],
  build: {
    // 3D 청크(three 포함)는 3D 화면에서만 동적 로드되므로 경고 기준을 올림
    chunkSizeWarningLimit: 1000,
    rolldownOptions: {
      output: {
        // three, react-three와 그 전용 의존성을 three 청크로 묶는다
        // 의존성 재귀 포함을 켜면 react까지 끌려와 메인 청크가 three 청크를 정적으로 가져가므로 끈다
        // scheduler는 react-dom과 공유하므로 넣지 않는다
        codeSplitting: {
          groups: [
            {
              name: 'three',
              test: /node_modules[\\/](three|@react-three|zustand|its-fine|suspend-react|use-sync-external-store|react-use-measure)[\\/]/,
              includeDependenciesRecursively: false,
            },
          ],
        },
      },
    },
  },
  test: {
    include: ['tests/unit/**/*.test.ts'],
  },
})
