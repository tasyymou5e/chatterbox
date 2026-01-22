import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { visualizer } from "rollup-plugin-visualizer";
import { VitePWA } from "vite-plugin-pwa";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [
    react(),
    mode === 'development' && componentTagger(),
    // Bundle analyzer - generates stats.html in production/analyze builds
    (mode === 'production' || mode === 'analyze') && visualizer({
      filename: 'stats.html',
      open: mode === 'analyze', // Auto-open only in analyze mode
      gzipSize: true,
      brotliSize: true,
      template: 'treemap',
    }),
    // PWA Plugin with Workbox configuration
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.png', 'og-image.png', 'robots.txt'],
      
      manifest: {
        name: 'Chatterbox',
        short_name: 'Chatterbox',
        description: 'Empowering children with autism through technology, education, and family connection',
        theme_color: '#4f46e5',
        background_color: '#ffffff',
        display: 'standalone',
        orientation: 'portrait-primary',
        scope: '/',
        start_url: '/',
        categories: ['education', 'kids', 'family'],
        icons: [
          {
            src: '/pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: '/pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: '/pwa-maskable-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable'
          }
        ]
      },
      
      workbox: {
        // Cache static assets
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        
        // Runtime caching strategies
        runtimeCaching: [
          // Supabase REST API - NetworkFirst with fallback
          {
            urlPattern: /^https:\/\/lxuqfgbukrrickanmmic\.supabase\.co\/rest\/v1\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'supabase-api-cache',
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60 // 1 hour
              },
              networkTimeoutSeconds: 10,
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          },
          // Supabase Edge Functions - NetworkOnly (no caching for mutations)
          {
            urlPattern: /^https:\/\/lxuqfgbukrrickanmmic\.supabase\.co\/functions\/.*/i,
            handler: 'NetworkOnly'
          },
          // Supabase Auth - NetworkOnly (critical for security)
          {
            urlPattern: /^https:\/\/lxuqfgbukrrickanmmic\.supabase\.co\/auth\/.*/i,
            handler: 'NetworkOnly'
          },
          // Supabase Storage - CacheFirst for images
          {
            urlPattern: /^https:\/\/lxuqfgbukrrickanmmic\.supabase\.co\/storage\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'supabase-storage-cache',
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 60 * 24 * 7 // 1 week
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          },
          // Google Fonts stylesheets
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'google-fonts-stylesheets',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365 // 1 year
              }
            }
          },
          // Google Fonts webfonts
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-webfonts',
              expiration: {
                maxEntries: 20,
                maxAgeSeconds: 60 * 60 * 24 * 365 // 1 year
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          }
        ],
        
        // Skip waiting and claim clients immediately
        skipWaiting: true,
        clientsClaim: true
      },
      
      devOptions: {
        enabled: false // Disable in dev to avoid caching issues
      }
    })
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    // Disable source maps in production to prevent code exposure
    sourcemap: mode !== 'production',
    rollupOptions: {
      output: {
        manualChunks: {
          // Core vendor bundle (React + Router)
          vendor: ['react', 'react-dom', 'react-router-dom'],
          // All UI components (Radix) consolidated
          ui: [
            '@radix-ui/react-dialog',
            '@radix-ui/react-dropdown-menu',
            '@radix-ui/react-popover',
            '@radix-ui/react-select',
            '@radix-ui/react-tabs',
            '@radix-ui/react-tooltip',
            '@radix-ui/react-slot',
            '@radix-ui/react-accordion',
            '@radix-ui/react-alert-dialog',
            '@radix-ui/react-avatar',
            '@radix-ui/react-checkbox',
            '@radix-ui/react-collapsible',
            '@radix-ui/react-context-menu',
            '@radix-ui/react-hover-card',
            '@radix-ui/react-label',
            '@radix-ui/react-menubar',
            '@radix-ui/react-navigation-menu',
            '@radix-ui/react-progress',
            '@radix-ui/react-radio-group',
            '@radix-ui/react-scroll-area',
            '@radix-ui/react-separator',
            '@radix-ui/react-slider',
            '@radix-ui/react-switch',
            '@radix-ui/react-toast',
            '@radix-ui/react-toggle',
            '@radix-ui/react-toggle-group',
            '@radix-ui/react-aspect-ratio',
          ],
          // Charts - only loaded for admin/analytics routes (~50KB)
          charts: ['recharts'],
          // Forms & State - needed globally (~35KB)
          forms: ['react-hook-form', '@hookform/resolvers', 'zod', 'zustand', '@tanstack/react-query'],
          // Supabase (separate for auth/data isolation)
          supabase: ['@supabase/supabase-js'],
          // Shared utilities - stable, cached long-term (~52KB)
          utils: [
            'lucide-react',
            'date-fns',
            'clsx',
            'tailwind-merge',
            'class-variance-authority',
          ],
          // Carousel & Calendar - only used in specific components (~25KB)
          carousel: ['embla-carousel-react', 'react-day-picker'],
        },
      },
    },
  },
}));
