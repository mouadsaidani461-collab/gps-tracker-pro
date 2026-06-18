#!/usr/bin/env node
/**
 * Generate PWA icons and favicons from Capture Tracking GPS shield logo.
 * Run: npm run generate:icons
 */
import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import pngToIco from 'png-to-ico';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.join(__dirname, '..', 'public');

const iconSvg = path.join(publicDir, 'icon-source.svg');
const maskableSvg = path.join(publicDir, 'icon-maskable-source.svg');

async function renderPng(svgPath, size, outPath) {
  await sharp(svgPath, { density: Math.max(144, size * 2) })
    .resize(size, size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png({ compressionLevel: 9, adaptiveFiltering: true })
    .toFile(outPath);
}

async function renderPngBuffer(svgPath, size) {
  return sharp(svgPath, { density: Math.max(144, size * 2) })
    .resize(size, size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();
}

async function main() {
  const outputs = [
    { svg: iconSvg, size: 192, file: '192x192.png' },
    { svg: iconSvg, size: 512, file: '512x512.png' },
    { svg: iconSvg, size: 180, file: '180x180.png' },
    { svg: iconSvg, size: 16, file: '16x16.png' },
    { svg: iconSvg, size: 32, file: '32x32.png' },
    { svg: maskableSvg, size: 512, file: 'maskable-icon.png' },
  ];

  for (const { svg, size, file } of outputs) {
    const out = path.join(publicDir, file);
    await renderPng(svg, size, out);
    console.log(`Created ${file}`);
  }

  const favicon16 = await renderPngBuffer(iconSvg, 16);
  const favicon32 = await renderPngBuffer(iconSvg, 32);
  const icoBuffer = await pngToIco([favicon16, favicon32]);
  await writeFile(path.join(publicDir, 'favicon.ico'), icoBuffer);
  console.log('Created favicon.ico (16x16 + 32x32)');

  // Backward-compatible aliases used elsewhere in the app
  const aliases = [
    ['192x192.png', 'icon-192.png'],
    ['512x512.png', 'icon-512.png'],
    ['maskable-icon.png', 'icon-512-maskable.png'],
  ];
  for (const [src, dest] of aliases) {
    await sharp(path.join(publicDir, src)).toFile(path.join(publicDir, dest));
    console.log(`Created ${dest} (alias)`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
