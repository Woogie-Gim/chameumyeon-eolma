import { defineConfig, devices } from '@playwright/test'

// 기본 프로젝트는 루트 배포(4173), base-path 프로젝트는 GitHub Pages와 같은 하위 경로 배포(4174)
export const BASE_PATH = '/chameumyeon-eolma/'

const chrome = {
  ...devices['Desktop Chrome'],
  // 헤드리스에서 소프트웨어 WebGL 사용
  launchOptions: { args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] },
}

export default defineConfig({
  testDir: 'tests/e2e',
  projects: [
    {
      name: 'chromium',
      testIgnore: /base-path\.spec\.ts/,
      use: { ...chrome, baseURL: 'http://localhost:4173' },
    },
    {
      name: 'base-path',
      testMatch: /base-path\.spec\.ts/,
      use: { ...chrome, baseURL: `http://localhost:4174${BASE_PATH}` },
    },
  ],
  webServer: [
    {
      command: 'npm run build && npm run preview -- --port 4173 --strictPort',
      url: 'http://localhost:4173',
      reuseExistingServer: !process.env.CI,
    },
    {
      // 타입 검사는 기본 빌드에서 하므로 vite build만 실행
      command: 'npx vite build --outDir dist-base && npx vite preview --outDir dist-base --port 4174 --strictPort',
      url: `http://localhost:4174${BASE_PATH}`,
      env: { BASE_PATH },
      reuseExistingServer: !process.env.CI,
    },
  ],
})
