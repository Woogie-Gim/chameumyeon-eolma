/// <reference types="vitest/config" />
import { copyFileSync } from 'node:fs'
import { resolve } from 'node:path'
import react from '@vitejs/plugin-react'
import { defineConfig, type Plugin } from 'vite'

// GitHub Pages 하위 경로 배포용. 미지정 시 루트
const base = process.env.BASE_PATH || '/'
// 배포 주소(끝 슬래시 포함). OG 태그는 절대 URL이 필요해 deploy.yml에서 넣는다. 없으면 base 기준 경로
const siteUrl = process.env.SITE_URL ? process.env.SITE_URL.replace(/\/?$/, '/') : base

// index.html의 OG 자리표시자 치환
function ogMeta(): Plugin {
  return {
    name: 'og-meta',
    transformIndexHtml: (html) => html.replaceAll('%APP_SITE_URL%', siteUrl).replaceAll('%APP_OG_IMAGE%', `${siteUrl}og.png`),
  }
}

// GitHub Pages는 없는 경로에 404.html을 준다. 새로고침과 하위 경로 진입에서도 앱이 열리도록 index.html을 복사
function spaFallback(): Plugin {
  let outDir = 'dist'
  return {
    name: 'spa-404-fallback',
    apply: 'build',
    configResolved(config) {
      outDir = resolve(config.root, config.build.outDir)
    },
    closeBundle() {
      copyFileSync(resolve(outDir, 'index.html'), resolve(outDir, '404.html'))
    },
  }
}

export default defineConfig({
  base,
  plugins: [react(), ogMeta(), spaFallback()],
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
    include: ['tests/unit/**/*.test.{ts,tsx}'],
  },
})
