import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [
    react(),
    mode === 'development' &&
    componentTagger(),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    target: 'es2015',
    minify: 'terser',
    cssMinify: true,
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: {
          // Core framework
          vendor: ['react', 'react-dom'],
          
          // Routing
          router: ['react-router-dom'],
          
          // UI Components - Split for better caching
          'ui-core': ['@radix-ui/react-dialog', '@radix-ui/react-dropdown-menu'],
          'ui-forms': ['@radix-ui/react-select', '@radix-ui/react-checkbox', '@radix-ui/react-radio-group'],
          'ui-layout': ['@radix-ui/react-accordion', '@radix-ui/react-collapsible', '@radix-ui/react-tabs'],
          
          // Data & State
          query: ['@tanstack/react-query'],
          supabase: ['@supabase/supabase-js'],
          
          // Charts & Visualization
          charts: ['recharts'],
          
          // Utilities
          utils: ['clsx', 'class-variance-authority', 'tailwind-merge'],
          
          // Icons
          icons: ['lucide-react'],
          
          // Forms
          forms: ['react-hook-form', '@hookform/resolvers', 'zod']
        }
      }
    },
    chunkSizeWarningLimit: 500,
    
    // Optimize assets
    assetsInlineLimit: 4096,
    
    // Advanced optimizations
    terserOptions: {
      compress: {
        drop_console: mode === 'production',
        drop_debugger: mode === 'production'
      }
    }
  },
  
  // Optimize dependencies
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-router-dom',
      '@supabase/supabase-js',
      'lucide-react'
    ]
  },
  
  // Enable compression
  esbuild: {
    drop: mode === 'production' ? ['console', 'debugger'] : []
  }
}));
