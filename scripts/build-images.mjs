/**
 * Builds the photo set into `public/images/` and writes the manifest the
 * slideshow reads.
 *
 * Static hosts expose no directory listing, so the app cannot discover
 * `images/` at runtime — this manifest is the data contract (CAP-2).
 *
 *   node scripts/build-images.mjs       (or: npm run images)
 *
 * Captions already present in an existing manifest are preserved across runs,
 * keyed by original filename, so re-running never wipes hand-written text.
 */

import sharp from 'sharp';
import exifr from 'exifr';
import { readdir, mkdir, writeFile, readFile, stat, rm } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const SRC_DIR = path.join(ROOT, 'images');
const OUT_DIR = path.join(ROOT, 'public', 'images');
const MANIFEST = path.join(OUT_DIR, 'manifest.json');

const SIZES = { small: 900, large: 1600 };
const WEBP_QUALITY = 80;
const LQIP_WIDTH = 20;

const SUPPORTED = /\.(jpe?g|png|webp|heic|heif|avif|tiff?)$/i;

/** Preserve captions from a previous run, keyed by original filename. */
async function loadExistingCaptions() {
  if (!existsSync(MANIFEST)) return new Map();
  try {
    const prev = JSON.parse(await readFile(MANIFEST, 'utf8'));
    return new Map(
      prev.filter((e) => e.origin && e.caption).map((e) => [e.origin, e.caption]),
    );
  } catch {
    console.warn('  ! existing manifest unreadable, captions not preserved');
    return new Map();
  }
}

/**
 * EXIF capture date, else file mtime, else null. Screenshots and
 * forwarded images routinely carry no DateTimeOriginal — never drop a photo
 * over a missing date, just order it later.
 */
async function resolveTakenAt(file) {
  try {
    const ex = await exifr.parse(file, ['DateTimeOriginal', 'CreateDate', 'ModifyDate']);
    const d = ex?.DateTimeOriginal ?? ex?.CreateDate ?? ex?.ModifyDate;
    if (d instanceof Date && !Number.isNaN(d.valueOf())) {
      return { at: d, source: 'exif' };
    }
  } catch {
    // Unparseable EXIF is not fatal.
  }
  try {
    const s = await stat(file);
    return { at: s.mtime, source: 'mtime' };
  } catch {
    return { at: null, source: 'none' };
  }
}

async function main() {
  if (!existsSync(SRC_DIR)) {
    console.error(`No images/ directory at ${SRC_DIR}`);
    process.exit(1);
  }

  const names = (await readdir(SRC_DIR)).filter((f) => SUPPORTED.test(f));
  if (names.length === 0) {
    console.error('images/ contains no supported image files.');
    process.exit(1);
  }

  const captions = await loadExistingCaptions();

  // Rebuild from scratch so removed photos do not linger in public/.
  await rm(OUT_DIR, { recursive: true, force: true });
  await mkdir(OUT_DIR, { recursive: true });

  console.log(`Reading ${names.length} file(s) from images/`);

  const read = [];
  const failed = [];
  for (const name of names) {
    const file = path.join(SRC_DIR, name);
    try {
      // .rotate() with no argument bakes the EXIF orientation flag into the
      // pixels. Without it, roughly half of all phone portraits render sideways.
      const pipeline = sharp(file, { failOn: 'error' }).rotate();
      const meta = await pipeline.metadata();
      const { at, source } = await resolveTakenAt(file);
      read.push({ name, file, meta, takenAt: at, dateSource: source });
    } catch (err) {
      // HEIC needs a libheif-enabled sharp. Report rather than die: the rest
      // of the set should still build.
      failed.push({ name, reason: err.message.split('\n')[0] });
    }
  }

  if (failed.length) {
    console.warn(`\n  ! ${failed.length} file(s) could not be read:`);
    for (const f of failed) console.warn(`    - ${f.name}: ${f.reason}`);
    if (failed.some((f) => /heic|heif/i.test(f.name))) {
      console.warn(
        '    HEIC support needs a libheif-enabled sharp build. Convert those\n' +
          '    files to JPEG before re-running.',
      );
    }
    console.warn('');
  }

  // Chronological: the loop should read as "our story so far", not a shuffle.
  // Undated photos sort last, then by filename so the order is at least stable.
  read.sort((a, b) => {
    if (a.takenAt && b.takenAt) return a.takenAt - b.takenAt;
    if (a.takenAt) return -1;
    if (b.takenAt) return 1;
    return a.name.localeCompare(b.name);
  });

  const manifest = [];
  let index = 0;

  for (const item of read) {
    index += 1;
    const stem = String(index).padStart(3, '0');

    const base = sharp(item.file).rotate();

    const outputs = {};
    for (const [label, width] of Object.entries(SIZES)) {
      const filename = `${stem}-${width}.webp`;
      // Cap the LONG edge, not the width: these are mostly 9:16 phone
      // portraits, and capping width alone leaves them 1600x2844 — far heavier
      // than a phone needs, and slow enough to decode to stutter the advance.
      const info = await base
        .clone()
        .resize({ width, height: width, fit: 'inside', withoutEnlargement: true })
        .webp({ quality: WEBP_QUALITY })
        .toFile(path.join(OUT_DIR, filename));
      outputs[label] = { filename, width: info.width, height: info.height };
    }

    // Tiny blurred placeholder, inlined as a data URI so the first paint is
    // never an empty rectangle.
    const lqipBuf = await base
      .clone()
      .resize({ width: LQIP_WIDTH })
      .blur(1.2)
      .webp({ quality: 40 })
      .toBuffer();

    manifest.push({
      src: `images/${outputs.large.filename}`,
      srcSmall: `images/${outputs.small.filename}`,
      w: outputs.large.width,
      h: outputs.large.height,
      lqip: `data:image/webp;base64,${lqipBuf.toString('base64')}`,
      takenAt: item.takenAt ? item.takenAt.toISOString() : null,
      dateSource: item.dateSource,
      origin: item.name,
      caption: captions.get(item.name) ?? null,
    });

    process.stdout.write(
      `  ${stem}  ${item.name.padEnd(42).slice(0, 42)} ${String(outputs.large.width).padStart(4)}x${String(outputs.large.height).padEnd(4)} ${item.dateSource}\n`,
    );
  }

  await writeFile(MANIFEST, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');

  const byExif = manifest.filter((m) => m.dateSource === 'exif').length;
  const byMtime = manifest.filter((m) => m.dateSource === 'mtime').length;
  const undated = manifest.filter((m) => m.dateSource === 'none').length;
  const kept = captions.size
    ? manifest.filter((m) => m.caption).length
    : 0;

  console.log(`\n${manifest.length} photo(s) built into public/images/`);
  console.log(`  dates: ${byExif} from EXIF, ${byMtime} from file mtime, ${undated} undated`);
  if (byExif === 0) {
    console.log('  note: no EXIF dates at all — order is by file mtime/name, not capture time');
  }
  if (kept) console.log(`  captions preserved: ${kept}`);
  if (failed.length) console.log(`  skipped: ${failed.length} (see warnings above)`);
}

await main();
