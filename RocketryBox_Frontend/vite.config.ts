import react from '@vitejs/plugin-react'
import path from "path"
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  // Ensure proper base path handling for Vercel and other deployments
  base: '/',
  server: {
    proxy: {
      '/api': {
        target: process.env.VITE_API_URL || 'http://localhost:8080',
        changeOrigin: true,
        secure: false,
      }
    }
  },
  build: {
    // Output directory for S3 deployment
    outDir: 'dist',
    // Generate source maps for debugging
    sourcemap: false,
    // Minify for production
    minify: 'terser',
    // Generate a 404.html file that redirects to index.html for SPA routing
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'ui-vendor': ['lucide-react', 'class-variance-authority', 'clsx', 'tailwind-merge']
        }
      }
    }
  },
  preview: {
    port: 8080,
    host: '0.0.0.0',
    strictPort: true,
    headers: {
      'Cache-Control': 'no-cache'
    }
  }
})
