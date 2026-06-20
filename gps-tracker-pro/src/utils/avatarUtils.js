/** Profile avatar — resize/compress before storing in Traccar user.attributes. */

export const AVATAR_ACCEPT = 'image/jpeg,image/png,image/webp';
export const AVATAR_MAX_FILE_BYTES = 5 * 1024 * 1024;
export const AVATAR_MAX_OUTPUT_BYTES = 120_000;
export const AVATAR_SIZE = 256;

const MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

export function estimateDataUrlBytes(dataUrl) {
  const base64 = dataUrl.split(',')[1] ?? '';
  return Math.ceil(base64.length * 0.75);
}

function loadImageFromFile(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('image load failed'));
    };
    img.src = url;
  });
}

async function resizeImageToDataUrl(file, maxDim) {
  const img = await loadImageFromFile(file);
  const scale = Math.min(1, maxDim / Math.max(img.width, img.height, 1));
  const width = Math.max(1, Math.round(img.width * scale));
  const height = Math.max(1, Math.round(img.height * scale));
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('canvas unavailable');
  ctx.drawImage(img, 0, 0, width, height);

  let quality = 0.85;
  let dataUrl = canvas.toDataURL('image/jpeg', quality);
  while (estimateDataUrlBytes(dataUrl) > AVATAR_MAX_OUTPUT_BYTES && quality > 0.4) {
    quality -= 0.1;
    dataUrl = canvas.toDataURL('image/jpeg', quality);
  }
  return dataUrl;
}

export async function processAvatarFile(file, t) {
  if (!file || !MIME_TYPES.has(file.type)) {
    throw new Error(t('settings.profile.photoInvalidType'));
  }
  if (file.size > AVATAR_MAX_FILE_BYTES) {
    throw new Error(t('settings.profile.photoTooLarge'));
  }

  const dataUrl = await resizeImageToDataUrl(file, AVATAR_SIZE);
  if (estimateDataUrlBytes(dataUrl) > AVATAR_MAX_OUTPUT_BYTES) {
    throw new Error(t('settings.profile.photoTooLarge'));
  }
  return dataUrl;
}
