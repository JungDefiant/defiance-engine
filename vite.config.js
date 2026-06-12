import { resolve } from 'node:dns';
import { defineConfig } from 'vite';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  base: '/<REPO>/',
  publicDir: 'public',
  build: {
    outDir: 'dist'
  },
  plugins: [tsconfigPaths()]
});
