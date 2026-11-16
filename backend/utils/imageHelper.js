const sharp = require('sharp');
const fs = require('fs');
const path = require('path');
const { getBufferFromR2, isR2Url } = require('./r2');

/**
 * Converts any image source (remote URL, local uploads path, buffer, or data URI)
 * to a standard PNG Base64 string suitable for WhatsApp Evolution API sendMedia.
 * Exactly like the invoice rendering method.
 * @param {string|Buffer} imageInput
 * @returns {Promise<string|null>} Base64-encoded PNG string (without data URI prefix)
 */
async function getImageAsPngBase64(imageInput) {
  if (!imageInput) return null;
  try {
    let buffer = null;

    if (Buffer.isBuffer(imageInput)) {
      buffer = imageInput;
    } else if (typeof imageInput === 'string') {
      const raw = imageInput.trim();
      if (!raw) return null;

      // 1. Data URI
      if (raw.startsWith('data:image/')) {
        const parts = raw.split(',');
        if (parts[1]) {
          buffer = Buffer.from(parts[1], 'base64');
        }
      }
      // 2. Local uploads folder
      else if (raw.includes('/uploads/') || (!raw.startsWith('http://') && !raw.startsWith('https://'))) {
        const uploadsDir = path.join(__dirname, '../uploads');
        let filename = raw;
        if (raw.includes('/uploads/')) {
          filename = raw.split('/uploads/').pop().split('?')[0];
        } else {
          filename = path.basename(raw);
        }
        const candidate = path.join(uploadsDir, filename);
        if (fs.existsSync(candidate)) {
          buffer = await fs.promises.readFile(candidate);
        }
      }

      // 3. Try R2 direct S3 SDK retrieval if it matches R2 URL or key
      if (!buffer && (isR2Url(raw) || raw.includes('.r2.dev') || raw.includes('r2.cloudflarestorage.com'))) {
        try {
          buffer = await getBufferFromR2(raw);
        } catch (r2Err) {
          console.warn('[imageHelper] R2 direct retrieval failed, falling back to fetch:', r2Err.message);
        }
      }

      // 4. Remote URL via HTTP Fetch (R2 fallback, Cloudinary, Wuilt, external CDN)
      if (!buffer && (raw.startsWith('http://') || raw.startsWith('https://'))) {
        try {
          const res = await fetch(raw, {
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            },
            signal: AbortSignal.timeout(12000)
          });
          if (res.ok) {
            buffer = Buffer.from(await res.arrayBuffer());
          } else {
            console.warn('[imageHelper] Failed to fetch image:', res.status, raw);
          }
        } catch (fetchErr) {
          console.warn('[imageHelper] Fetch error:', fetchErr.message, raw);
        }
      }
    }

    if (!buffer || buffer.length === 0) return null;

    // Convert to standard PNG and limit dimension to max 1200px for speed and WhatsApp compatibility
    const pngBuffer = await sharp(buffer)
      .resize({ width: 1200, withoutEnlargement: true })
      .png({ compressionLevel: 8 })
      .toBuffer();

    return pngBuffer.toString('base64');
  } catch (err) {
    console.warn('[imageHelper] Error converting image to PNG Base64:', err.message);
    return null;
  }
}

module.exports = { getImageAsPngBase64 };
