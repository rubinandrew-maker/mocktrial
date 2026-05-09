import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['rtd-logo.png'],
      manifest: {
        name: 'Emile Theory',
        short_name: 'Emile Theory',
        theme_color: '#1e293b',
        background_color: '#f8fafc',
        display: 'fullscreen',
        orientation: 'any',
        icons: [
          { src: 'rtd-logo.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,png,svg,ico}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/firestore\.googleapis\.com\//,
            handler: 'NetworkFirst',
            options: { cacheName: 'firestore-cache', networkTimeoutSeconds: 5 }
          },
          {
            urlPattern: /^https:\/\/www\.youtube\.com\//,
            handler: 'NetworkOnly'
          }
        ]
      }
    })
  ]
});
