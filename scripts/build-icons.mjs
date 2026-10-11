/**
 * Renders the app icons from one inline SVG.
 *
 *   node scripts/build-icons.mjs      (or: npm run icons)
 *
 * Committed output, not a build-time step — these change roughly never, and a
 * missing icon silently degrades the install prompt rather than failing a build.
 */

import sharp from 'sharp';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const OUT_DIR = path.join(ROOT, 'public', 'icons');

const NIGHT = '#150b19';
const GOLD = '#d4af6a';
const GOLD_SOFT = '#e8c88a';

/**
 * A wrapped gift box: ribbon cross, bow, lid.
 * `inset` leaves room for maskable icons, whose outer ~10% gets cropped on
 * Android's adaptive shapes.
 */
function giftSvg({ size, inset = 0, rounded = true }) {
  const pad = size * inset;
  const boxSize = size - pad * 2;
  const bodyTop = pad + boxSize * 0.34;
  const bodyHeight = boxSize * 0.56;
  const lidTop = pad + boxSize * 0.22;
  const lidHeight = boxSize * 0.14;
  const cx = size / 2;
  const radius = rounded ? size * 0.18 : 0;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" rx="${radius}" fill="${NIGHT}"/>
  <rect x="${pad + boxSize * 0.12}" y="${bodyTop}" width="${boxSize * 0.76}" height="${bodyHeight}"
        rx="${boxSize * 0.05}" fill="none" stroke="${GOLD}" stroke-width="${size * 0.035}"/>
  <rect x="${pad + boxSize * 0.06}" y="${lidTop}" width="${boxSize * 0.88}" height="${lidHeight}"
        rx="${boxSize * 0.04}" fill="none" stroke="${GOLD}" stroke-width="${size * 0.035}"/>
  <line x1="${cx}" y1="${lidTop}" x2="${cx}" y2="${bodyTop + bodyHeight}"
        stroke="${GOLD_SOFT}" stroke-width="${size * 0.035}"/>
  <path d="M ${cx} ${lidTop} C ${cx - boxSize * 0.2} ${lidTop - boxSize * 0.18}, ${cx - boxSize * 0.26} ${lidTop - boxSize * 0.02}, ${cx - boxSize * 0.02} ${lidTop}"
        fill="none" stroke="${GOLD_SOFT}" stroke-width="${size * 0.03}" stroke-linecap="round"/>
  <path d="M ${cx} ${lidTop} C ${cx + boxSize * 0.2} ${lidTop - boxSize * 0.18}, ${cx + boxSize * 0.26} ${lidTop - boxSize * 0.02}, ${cx + boxSize * 0.02} ${lidTop}"
        fill="none" stroke="${GOLD_SOFT}" stroke-width="${size * 0.03}" stroke-linecap="round"/>
</svg>`;
}

const TARGETS = [
  { file: 'icon-192.png', size: 192, inset: 0.06 },
  { file: 'icon-512.png', size: 512, inset: 0.06 },
  // Maskable: extra padding so Android's shape crop does not clip the box.
  { file: 'icon-maskable-512.png', size: 512, inset: 0.18, rounded: false },
  // iOS ignores transparency and applies its own rounding.
  { file: 'apple-touch-icon.png', size: 180, inset: 0.08, rounded: false },
];

await mkdir(OUT_DIR, { recursive: true });

for (const { file, size, inset, rounded } of TARGETS) {
  const svg = giftSvg({ size, inset, rounded: rounded ?? true });
  const info = await sharp(Buffer.from(svg)).png().toFile(path.join(OUT_DIR, file));
  console.log(`  ${file.padEnd(26)} ${info.width}x${info.height}  ${info.size} B`);
}

// Scalable favicon for the browser tab.
const favicon = giftSvg({ size: 64, inset: 0.06 });
await writeFile(path.join(ROOT, 'public', 'favicon.svg'), favicon, 'utf8');
console.log('  favicon.svg');

console.log('\nIcons written to public/icons/');
