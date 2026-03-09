import { defineConfig } from 'vite'
import { resolve } from 'node:path'

export default defineConfig({
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      name: 'DevInspector',
      formats: ['iife'],
      fileName: () => 'inspector.iife.js',
    },
    outDir: 'dist',
    minify: false,  // keep readable for debugging
    rollupOptions: {
      output: {
        inlineDynamicImports: true,
      },
    },
  },
})
