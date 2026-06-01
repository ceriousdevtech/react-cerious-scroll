/// <reference types="vitest/config" />
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import dts from 'vite-plugin-dts';

export default defineConfig({
  plugins: [react(), dts({ include: ['src'], insertTypesEntry: true })],
  build: {
    lib: {
      entry: fileURLToPath(new URL('src/index.ts', import.meta.url)),
      name: 'ReactCeriousScroll',
      formats: ['es', 'cjs'],
      fileName: (format) => (format === 'es' ? 'index.js' : 'index.cjs'),
    },
    rollupOptions: {
      external: [
        'react',
        'react-dom',
        'react-dom/server',
        'react/jsx-runtime',
        '@ceriousdevtech/cerious-scroll',
      ],
      output: {
        globals: {
          react: 'React',
          'react-dom': 'ReactDOM',
        },
      },
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./test/setup.ts'],
    server: {
      // The engine ships ESM with extensionless relative imports that Node's
      // native resolver can't load; inlining routes it through Vite's resolver.
      deps: { inline: ['@ceriousdevtech/cerious-scroll'] },
    },
  },
});
