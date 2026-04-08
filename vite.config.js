import { defineConfig } from 'vite'

export default defineConfig({
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    minify: true,
    brotliSize: true
  },
  optimizeDeps: {
    exclude: ['vtracer-web']
  }
})