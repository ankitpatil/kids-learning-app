/// <reference types="vitest" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import { MEDIAPIPE_CACHE_PATTERN } from './src/motion/assets';

export default defineConfig({
  base: './',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      workbox: {
        // Move mode's MediaPipe files (~23 MB) are too big to precache: skip them here and cache them
        // the first time Move mode loads them, so Move mode works offline afterwards (M4b).
        globIgnores: ['mediapipe/**', 'prototypes/**'],
        // Fonts and the bundled Fluent Emoji icons (I1) are precached so pictures work offline.
        globPatterns: ['**/*.{js,css,html,svg,woff2,webmanifest}'],
        runtimeCaching: [
          {
            // A RegExp (not a function) so it is inlined into the generated sw.js.
            urlPattern: MEDIAPIPE_CACHE_PATTERN,
            handler: 'CacheFirst',
            options: {
              cacheName: 'mediapipe-v1',
              expiration: { maxEntries: 10 },
              cacheableResponse: { statuses: [200] },
            },
          },
        ],
      },
      manifest: {
        name: 'Little Learners',
        short_name: 'Learners',
        description: 'Reading and math games for ages 5–7',
        theme_color: '#6c5ce7',
        background_color: '#fff8e7',
        display: 'standalone',
        orientation: 'any',
        icons: [{ src: 'icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any maskable' }],
      },
    }),
  ],
  test: { environment: 'node' },
});
