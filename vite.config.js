import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';

export default defineConfig({
  plugins: [vue()],
  base: '/WebSED/', // Base URL for deployment on GitHub Pages
  assetsInclude: ['**/*.wasm', '**/*.onnx'], // Include additional asset types
  build: {
    target: 'esnext',
    rollupOptions: {
      output: {
        manualChunks: {
          'onnx-wasm': ['onnxruntime-web'], // Optimize onnxruntime-web
        },
      },
    },
  },
  server: {
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin', // Required for cross-origin isolation
      'Cross-Origin-Embedder-Policy': 'require-corp', // Required for Wasm execution
    },
  },
  optimizeDeps: {
    exclude: ['onnxruntime-web'], // Exclude onnxruntime-web from optimization
  },
});
