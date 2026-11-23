/// <reference types="vitest/config" />
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [react()],
  build: {
    // 3D 청크(three 포함)는 결과 화면에서만 동적 로드되므로 경고 기준을 올림
    chunkSizeWarningLimit: 1000,
  },
  test: {
    include: ['tests/unit/**/*.test.ts'],
  },
})
