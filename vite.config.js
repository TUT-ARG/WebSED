import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';

export default defineConfig({
  plugins: [vue()],
  base: '/WebSED/', 
  assetsInclude: ['*/.wasm', '*/.onnx'], // Include additional asset types
  build: {
    target: 'esnext',
    rollupOptions: {
      output: {
        manualChunks: {
          'onnx-wasm': ['onnxruntime-web'],
        },
      },
    },
  },
  server: {
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'require-corp',
    },
  },
  optimizeDeps: {
    exclude: ['onnxruntime-web'],
  },
});
