import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const demoDir = fileURLToPath(new URL('.', import.meta.url));
const libEntry = fileURLToPath(new URL('../src/index.ts', import.meta.url));
const engineEntry = fileURLToPath(
  new URL('../../cerious-scroll/src/index.ts', import.meta.url),
);
const engineRoot = fileURLToPath(new URL('../../cerious-scroll', import.meta.url));

// The demo imports the wrapper by its package name, aliased to the library
// source so changes are picked up live without a separate build step. We also
// alias the core engine to its sibling source tree so engine changes flow
// straight into the demo.
export default defineConfig({
  root: demoDir,
  plugins: [react()],
  resolve: {
    alias: {
      '@ceriousdevtech/react-cerious-scroll': libEntry,
      '@ceriousdevtech/cerious-scroll': engineEntry,
    },
  },
  server: {
    host: true, // bind 0.0.0.0 so phones on the LAN can reach the demo
    port: 5173,
    strictPort: true,
    fs: {
      // Allow importing files from the parent (the library `src`) and the
      // sibling core engine.
      allow: [fileURLToPath(new URL('..', import.meta.url)), engineRoot],
    },
  },
});
