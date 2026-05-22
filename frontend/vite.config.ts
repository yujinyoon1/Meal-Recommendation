import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import path from 'node:path';

// Frontend dev port: 9514
// Public domain (prod via Nginx): https://p14.sumzip.com
export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  server: {
    host: '0.0.0.0',
    port: 9514,
    strictPort: true,
    // 로컬 개발 시 /api 프록시 — 백엔드 dev 서버는 9534
    proxy: {
      '/api': {
        target: 'http://localhost:9534',
        changeOrigin: true,
      },
    },
    // 도메인 hostname으로 접근 시 허용
    allowedHosts: ['p14.sumzip.com', 'localhost'],
  },
  preview: {
    port: 9514,
    strictPort: true,
  },
  test: {
    environment: 'jsdom',
    globals: true,
    // Playwright e2e 디렉터리는 vitest 대상 제외
    include: ['tests/unit/**/*.{test,spec}.{ts,js}', 'src/**/__tests__/**/*.{ts,js}'],
    exclude: ['node_modules', 'dist', 'tests/e2e/**', 'playwright-report'],
  },
});
