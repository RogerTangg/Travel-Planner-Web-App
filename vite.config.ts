import path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  server: {
    port: 3000,
    host: '0.0.0.0',
    // 開發環境代理設定：將 /api 請求轉發到 Cloudflare Functions 開發伺服器
    proxy: {
      '/api': {
        target: 'http://localhost:8788',
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    // 優化打包設定 (Build Optimization)
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-dnd': ['@dnd-kit/core', '@dnd-kit/sortable', '@dnd-kit/utilities'],
        }
      }
    }
  },
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
      '@components': path.resolve(__dirname, './components'),
      '@hooks': path.resolve(__dirname, './hooks'),
      '@stores': path.resolve(__dirname, './stores'),
      '@services': path.resolve(__dirname, './services'),
    }
  }
});
