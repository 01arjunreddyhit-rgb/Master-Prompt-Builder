import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

const rootDir = process.cwd();

export default defineConfig({
  plugins: [
    react(),
  ],
  resolve: {
    alias: {
      "@": path.resolve(rootDir, "client", "src"),
      "@shared": path.resolve(rootDir, "shared"),
      "@assets": path.resolve(rootDir, "attached_assets"),
    },
  },
  root: path.resolve(rootDir, "client"),
  build: {
    outDir: path.resolve(rootDir, "dist/public"),
    emptyOutDir: true,
    chunkSizeWarningLimit: 5000,
    reportCompressedSize: false,
    sourcemap: false,
    minify: 'esbuild',
  },
  optimizeDeps: {
    // Prevent pre-bundling massive libraries
    exclude: ['lucide-react'],
  },
  server: {
    fs: {
      strict: true,
      deny: ["**/.*"],
    },
  },
});
