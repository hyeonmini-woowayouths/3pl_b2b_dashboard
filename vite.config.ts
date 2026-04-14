import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    host: true, // 외부 네트워크 접근 허용
    port: 5174, // 카카오 도메인 등록과 일치 (변경 시 카카오 콘솔도 갱신 필요)
    strictPort: true, // 포트 점유 시 fallback 없이 즉시 에러
    allowedHosts: true, // 모든 호스트 허용 (cloudflared 터널 등)
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
})
