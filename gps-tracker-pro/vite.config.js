import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { execSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = path.dirname(fileURLToPath(import.meta.url));

function captureBuildVersion() {
  return {
    name: 'capture-build-version',
    writeBundle(options) {
      const outDir = options.dir || path.join(rootDir, 'dist');
      const swPath = path.join(outDir, 'sw.js');
      let version;
      try {
        version = execSync('git rev-parse --short HEAD', { cwd: rootDir }).toString().trim();
      } catch {
        version = Date.now().toString(36);
      }
      const content = readFileSync(swPath, 'utf8').replaceAll('@CAPTURE_BUILD_VERSION@', version);
      writeFileSync(swPath, content);
    },
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, rootDir, '');
  const apiTarget = env.VITE_DEV_API_TARGET || 'http://localhost:8082';

  return {
    plugins: [react(), tailwindcss(), captureBuildVersion()],
    server: {
      port: 5173,
      open: false,
      proxy: {
        '/api': {
          target: apiTarget,
          changeOrigin: true,
          ws: true,
        },
      },
    },
    build: {
      outDir: 'dist',
      sourcemap: false,
      chunkSizeWarningLimit: 500,
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (!id.includes('node_modules')) return undefined;
            if (/[/\\]node_modules[/\\](react|react-dom|react-router|react-router-dom)[/\\]/.test(id)) {
              return 'vendor';
            }
            if (/[/\\]node_modules[/\\](leaflet|react-leaflet)[/\\]/.test(id)) {
              return 'map';
            }
            if (/[/\\]node_modules[/\\]jspdf(-autotable)?[/\\]/.test(id)) {
              return 'pdf';
            }
            if (/[/\\]node_modules[/\\]exceljs[/\\]/.test(id)) {
              return 'excel';
            }
            return undefined;
          },
        },
      },
    },
  };
});
