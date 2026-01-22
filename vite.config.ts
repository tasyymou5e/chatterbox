import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { visualizer } from "rollup-plugin-visualizer";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [
    react(),
    mode === 'development' && componentTagger(),
    // Bundle analyzer - generates stats.html in production builds
    mode === 'production' && visualizer({
      filename: 'stats.html',
      open: false,
      gzipSize: true,
      brotliSize: true,
      template: 'treemap',
    }),
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
        },
      },
    },
  },
}));
