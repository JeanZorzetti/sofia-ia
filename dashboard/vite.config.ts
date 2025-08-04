import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 5173,
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
  // 🚀 CONFIGURAÇÃO PWA - COPIAR ARQUIVOS PUBLIC
  publicDir: 'public',
  build: {
    // Configuração básica e funcional
    minify: 'esbuild',
    sourcemap: false,
    target: 'esnext',
    // Copiar todos os arquivos da pasta public
    copyPublicDir: true,
    rollupOptions: {
      output: {
        // Nomes simples dos arquivos
        entryFileNames: 'assets/[name]-[hash].js',
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]',
      },
    },
    // Configurações básicas
    chunkSizeWarningLimit: 1000,
    reportCompressedSize: false,
    cssCodeSplit: true,
    cssMinify: 'esbuild',
  },
  // Configurações básicas de otimização
  optimizeDeps: {
    include: ['react', 'react-dom'],
  },
  // Variáveis de ambiente
  define: {
    __APP_VERSION__: JSON.stringify('1.0.0'),
  },
}));