import { defineConfig } from 'vite';

export default defineConfig({
  // Relative base so the build works from any path — a GitHub Pages
  // project page (username.github.io/repo/), a user/org page, or just
  // opening dist/index.html directly.
  base: './',
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
  },
});
