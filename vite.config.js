import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  // Percorsi relativi: l'app funziona sotto qualunque cartella (GitHub Pages la serve
  // da /nome-repo/), e la navigazione usa l'hash, quindi non servono redirect.
  base: './',
  plugins: [
    svelte(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'apple-touch-icon.png'],
      manifest: {
        name: 'Terza palla',
        short_name: 'Terza palla',
        description: 'Allenamento e diario di tennistavolo',
        lang: 'it',
        start_url: '.',
        scope: '.',
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#F5F2EB',
        theme_color: '#F5F2EB',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        navigateFallback: 'index.html',
        cleanupOutdatedCaches: true
      }
    })
  ],
  build: {
    target: 'es2022'
  },
  test: {
    include: ['tests/**/*.test.js']
  }
});
