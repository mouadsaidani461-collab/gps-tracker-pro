#!/usr/bin/env node
/**
 * Ensures Traccar API is reachable before starting Vite dev server.
 * Default target matches vite.config.js (VITE_DEV_API_TARGET || localhost:8082).
 */
import { loadEnv } from 'vite';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = path.dirname(fileURLToPath(new URL('..', import.meta.url)));
const env = loadEnv('development', rootDir, '');
const target = env.VITE_DEV_API_TARGET || 'http://localhost:8082';
const healthUrl = `${target.replace(/\/$/, '')}/api/server`;

async function check() {
  try {
    const res = await fetch(healthUrl, { signal: AbortSignal.timeout(3000) });
    if (res.ok) {
      console.log(`✓ Traccar API reachable at ${target}`);
      return;
    }
    throw new Error(`HTTP ${res.status}`);
  } catch (err) {
    console.error('\n✗ Traccar API not reachable:', healthUrl);
    console.error('  Reason:', err.message || err);
    console.error('\nStart the backend first:\n');
    console.error('  cd gps-tracker-pro');
    console.error('  docker compose up -d traccar traccar-init');
    console.error('\nThen wait ~30s and run: npm run dev\n');
    console.error('Or use the built frontend: http://localhost:3000\n');
    process.exit(1);
  }
}

check();
