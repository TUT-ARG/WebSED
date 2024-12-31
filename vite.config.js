import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';

export default defineConfig({
  plugins: [vue()],
  base: '/WebSED/', // Explicit base path for deployment
  assetsInclude: ['**/*.wasm', '**/*.onnx'], // Include additional asset types
  build: {
    target: 'esnext',
    rollupOptions: {
      output: {
        manualChunks: {
          'onnx-wasm': ['onnxruntime-web'], // Splitting onnx-wasm for optimization
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
