import { defineConfig } from 'vite';

// IMPORTANT: schimbă '/talantul-in-negot/' cu '/<numele-repo-ului-tau-github>/'
// Dacă publici pe un domeniu custom sau la rădăcina site-ului, pune base: '/'
export default defineConfig({
  base: '/talantul-in-negot/',
  build: {
    outDir: 'dist',
    sourcemap: false,
  },
  server: {
    port: 5173,
  },
});
