import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, loadEnv} from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, '.', '');
  return {
    plugins: [
      react(), 
      tailwindcss(),
      VitePWA({
        registerType: 'prompt',
        includeAssets: ['logo.png', 'bell.wav'],
        manifest: {
          name: 'IIT Calendar',
          short_name: 'IITCal',
          description: 'IIT Calendar Application',
          theme_color: '#ffffff',
          icons: [
            {
              src: 'icons/icon-192.webp',
              sizes: '192x192',
              type: 'image/webp'
            },
            {
              src: 'icons/icon-512.webp',
              sizes: '512x512',
              type: 'image/webp'
            },
            {
              src: 'icons/icon-512.webp',
              sizes: '512x512',
              type: 'image/webp',
              purpose: 'any maskable'
            }
          ]
        },
        workbox: {
          globPatterns: ['**/*.{js,css,html,ico,png,svg,wav,json}'],
          cleanupOutdatedCaches: true,
          clientsClaim: true,
          skipWaiting: true,
        }
      })
    ],
    worker: {
      format: 'es',
    },
    optimizeDeps: {
      exclude: ['@journeyapps/wa-sqlite', '@powersync/web'],
    },
    define: {
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
        'react-native': 'react-native-web',
      },
    },
    server: {
      headers: {
        'Cross-Origin-Opener-Policy': 'same-origin',
        'Cross-Origin-Embedder-Policy': 'require-corp',
      },
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
    },
  };
});
