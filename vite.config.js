import { resolve } from 'node:dns';
import { defineConfig } from 'vite';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  base: '/defiance-engine/',
  publicDir: '/defiance-engine/public',
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    minify: 'esbuild'
  },
  server: {
    host: true
  },
  plugins: [tsconfigPaths()]
});
