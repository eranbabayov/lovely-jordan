/** One entry of `public/images/manifest.json`, written by scripts/build-images.mjs. */
export interface Photo {
  /** 1600px long-edge WebP, relative to the site base. */
  src: string;
  /** 900px variant for narrow screens. */
  srcSmall: string;
  w: number;
  h: number;
  /** Inline blurred placeholder, so first paint is never an empty rectangle. */
  lqip: string;
  /** ISO capture time, or null when no date could be resolved. */
  takenAt: string | null;
  dateSource: 'exif' | 'mtime' | 'none';
  /** Original filename; the key captions are preserved against. */
  origin: string;
  caption: string | null;
}

const base = import.meta.env.BASE_URL;

/** Resolve a manifest-relative path against the deployed base path. */
export function photoUrl(relative: string): string {
  return `${base}${relative}`;
}

export async function loadManifest(): Promise<Photo[]> {
  const res = await fetch(`${base}images/manifest.json`, { cache: 'no-cache' });
  if (!res.ok) {
    throw new Error(
      `Photo manifest missing (HTTP ${res.status}). Run \`npm run images\`.`,
    );
  }
  const data: unknown = await res.json();
  if (!Array.isArray(data) || data.length === 0) {
    throw new Error('Photo manifest is empty. Run `npm run images`.');
  }
  return data as Photo[];
}

/**
 * Pick the size variant once, up front, rather than leaving it to `srcset`:
 * the preloader has to know the exact URL it is decoding.
 */
export function pickSrc(photo: Photo): string {
  const dpr = typeof window === 'undefined' ? 1 : window.devicePixelRatio || 1;
  const width = typeof window === 'undefined' ? 1200 : window.innerWidth;
  return photoUrl(width * dpr <= 1100 ? photo.srcSmall : photo.src);
}

/**
 * Decode ahead of time. At a 4s cadence an undecoded image produces a visible
 * hitch on advance, so the next few are decoded before they are ever shown.
 */
export async function preload(url: string): Promise<void> {
  const img = new Image();
  img.src = url;
  try {
    await img.decode();
  } catch {
    // A failed decode must not stall the loop; the <img> will retry on render.
  }
}
