// @vitest-environment node
/**
 * Bundle size gates — runs production build and checks gzip entry size.
 * Skip build cache: PERF_SKIP_BUILD=1 npm test tests/performance.spec.js
 */
import { describe, it, expect, beforeAll } from 'vitest';
import { execSync } from 'node:child_process';
import {
  readFileSync, readdirSync, existsSync, statSync,
} from 'node:fs';
import { gzipSync } from 'node:zlib';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const distDir = path.join(rootDir, 'dist');
const assetsDir = path.join(distDir, 'assets');

const INDEX_GZIP_MAX = 200 * 1024;
const CHUNK_RAW_MAX = 500 * 1024;

function runBuild() {
  execSync('npm run build', {
    cwd: rootDir,
    stdio: 'pipe',
    env: { ...globalThis.process?.env, NODE_ENV: 'production' },
  });
}

function findEntryScript() {
  const html = readFileSync(path.join(distDir, 'index.html'), 'utf8');
  const match = html.match(/<script[^>]+type="module"[^>]+src="([^"]+)"/);
  if (!match) throw new Error('No module entry script in dist/index.html');
  const src = match[1].replace(/^\//, '');
  return path.join(distDir, src);
}

function listJsAssets() {
  return readdirSync(assetsDir)
    .filter((f) => f.endsWith('.js'))
    .map((f) => path.join(assetsDir, f));
}

describe('production bundle size', () => {
  beforeAll(() => {
    if (globalThis.process?.env?.PERF_SKIP_BUILD !== '1') {
      runBuild();
    }
    if (!existsSync(distDir)) {
      throw new Error('dist/ missing — run npm run build first');
    }
  });

  it('index entry gzip < 200 KB', () => {
    const entryPath = findEntryScript();
    const raw = readFileSync(entryPath);
    const gz = gzipSync(raw);
    expect(gz.length).toBeLessThan(INDEX_GZIP_MAX);
  });

  it('route chunks stay under 500 KB raw (heavy libs split out)', () => {
    const vendorLazy = /^(excel|pdf|vendor|map)-/;
    const oversized = listJsAssets().filter((file) => {
      const base = path.basename(file);
      if (vendorLazy.test(base)) return false;
      return statSync(file).size > CHUNK_RAW_MAX;
    });
    expect(oversized.map((f) => path.basename(f))).toEqual([]);
  });

  it('excel and pdf are separate lazy chunks', () => {
    const names = readdirSync(assetsDir).filter((f) => f.endsWith('.js'));
    const hasExcel = names.some((n) => n.includes('excel'));
    const hasPdf = names.some((n) => n.includes('pdf'));
    expect(hasExcel).toBe(true);
    expect(hasPdf).toBe(true);
  });
});
