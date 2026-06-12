/** jsPDF Arabic font helpers — loads Noto Sans Arabic when Arabic script is detected. */

const ARABIC_SCRIPT_RE = /[\u0600-\u06FF]/;

const FONT_NAME = 'NotoSansArabic';
const FONT_FILE = 'NotoSansArabic-Regular.ttf';
const FONT_URLS = [
  '/fonts/NotoSansArabic-Regular.ttf',
  'https://cdn.jsdelivr.net/gh/googlefonts/noto-fonts@main/hinted/ttf/NotoSansArabic/NotoSansArabic-Regular.ttf',
];

let arabicFontPromise = null;

export function containsArabic(text) {
  return ARABIC_SCRIPT_RE.test(String(text ?? ''));
}

export function textNeedsArabicFont(...values) {
  return values.some((value) => {
    if (Array.isArray(value)) return textNeedsArabicFont(...value);
    return containsArabic(value);
  });
}

function arrayBufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}

async function fetchFontArrayBuffer() {
  let lastError = null;
  for (const url of FONT_URLS) {
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return response.arrayBuffer();
    } catch (err) {
      lastError = err;
    }
  }
  throw lastError ?? new Error('Arabic font unavailable');
}

export async function ensureArabicPdfFont(doc) {
  if (doc.getFontList()?.[FONT_NAME]) return FONT_NAME;

  if (!arabicFontPromise) {
    arabicFontPromise = (async () => {
      const buffer = await fetchFontArrayBuffer();
      doc.addFileToVFS(FONT_FILE, arrayBufferToBase64(buffer));
      doc.addFont(FONT_FILE, FONT_NAME, 'normal');
      return FONT_NAME;
    })();
  }

  return arabicFontPromise;
}

/** Reset cached font load (tests only). */
export function resetArabicPdfFontCache() {
  arabicFontPromise = null;
}
