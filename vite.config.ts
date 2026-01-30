import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    
    // 安全模式：不暴露 API Key 到前端
    const isSecureMode = env.SECURE_MODE === 'true';
    
    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
        // Proxy API requests to backend server in secure mode
        proxy: isSecureMode ? {
          '/api': {
            target: 'http://localhost:3001',
            changeOrigin: true,
          }
        } : undefined
      },
      plugins: [react()],
      define: isSecureMode ? {} : {
        // 僅在非安全模式下暴露 API Key（開發用途）
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});
