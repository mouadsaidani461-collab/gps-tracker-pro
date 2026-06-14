#!/usr/bin/env node
/**
 * Generate PWA PNG icons and favicon.ico from public/icon.svg + icon-maskable.svg
 * Run: node scripts/generate-icons.mjs
 */
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import pngToIco from 'png-to-ico';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.join(__dirname, '..', 'public');

const SIZES = [72, 96, 128, 144, 152, 192, 384, 512];
const MASKABLE_SIZES = [192, 512];

async function renderPng(svgPath, size, outPath) {
  await sharp(svgPath, { density: Math.max(144, size * 2) })
    .resize(size, size)
    .png({ compressionLevel: 9 })
    .toFile(outPath);
}

async function main() {
  const iconSvg = path.join(publicDir, 'icon.svg');
  const maskableSvg = path.join(publicDir, 'icon-maskable.svg');

  for (const size of SIZES) {
    const out = path.join(publicDir, `icon-${size}.png`);
    await renderPng(iconSvg, size, out);
    console.log(`Created ${path.basename(out)}`);
  }

  for (const size of MASKABLE_SIZES) {
    const out = path.join(publicDir, `icon-${size}-maskable.png`);
    await renderPng(maskableSvg, size, out);
    console.log(`Created ${path.basename(out)}`);
  }

  const faviconSizes = [16, 32, 48];
  const faviconBuffers = await Promise.all(
    faviconSizes.map((size) =>
      sharp(iconSvg, { density: 256 })
        .resize(size, size)
        .png()
        .toBuffer(),
    ),
  );

  const icoBuffer = await pngToIco(faviconBuffers);
  await writeFile(path.join(publicDir, 'favicon.ico'), icoBuffer);
  console.log('Created favicon.ico');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
