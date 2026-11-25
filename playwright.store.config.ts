import { defineConfig, devices } from '@playwright/test'

// 스토어 스크린샷 전용 설정. npm run store:screens로만 실행(기본 E2E에는 포함되지 않음)
// 콘솔 세로형 규격 636x1048. 같은 비율(390:643)의 뷰포트를 2배율로 찍고 스펙에서 축소
export default defineConfig({
  testDir: 'tests/store',
  workers: 1,
  timeout: 120_000,
  use: {
    ...devices['Desktop Chrome'],
    viewport: { width: 390, height: 643 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
    colorScheme: 'light',
    baseURL: 'http://localhost:4175',
    // 헤드리스에서 소프트웨어 WebGL 사용
    launchOptions: { args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] },
  },
  webServer: {
    // 타입 검사와 앱인토스 빌드는 생략하고 화면만 빌드
    command: 'npx vite build --outDir dist-store && npx vite preview --outDir dist-store --port 4175 --strictPort',
    url: 'http://localhost:4175',
    reuseExistingServer: !process.env.CI,
  },
})
