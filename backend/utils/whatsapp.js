const Setting = require('../models/Setting');
const fs = require('fs');
const path = require('path');

async function prepareMedia(mediaInput) {
  if (!mediaInput) return null;

  if (typeof mediaInput === 'object' && mediaInput !== null && mediaInput.media) {
    return mediaInput;
  }

  const rawUrl = typeof mediaInput === 'string' ? mediaInput.trim() : '';
  if (!rawUrl) return null;

  // 1. If it's a data URL / base64
  if (rawUrl.startsWith('data:image/')) {
    const parts = rawUrl.split(',');
    const meta = parts[0];
    const base64Data = parts[1];
    const mimeMatch = meta.match(/data:(.*?);base64/);
    const mime = mimeMatch ? mimeMatch[1] : 'image/jpeg';
    const ext = mime.includes('png') ? '.png' : (mime.includes('webp') ? '.webp' : '.jpg');
    return {
      media: base64Data,
      mimetype: mime,
      fileName: `product${ext}`
    };
  }

  // 2. Check if it's a local file in uploads/
  const uploadsDir = path.join(__dirname, '../uploads');
  let localFilePath = null;

  if (rawUrl.includes('/uploads/')) {
    const filename = rawUrl.split('/uploads/').pop().split('?')[0];
    const candidate = path.join(uploadsDir, filename);
    if (fs.existsSync(candidate)) {
      localFilePath = candidate;
    }
  } else if (!rawUrl.startsWith('http://') && !rawUrl.startsWith('https://')) {
    const candidate = path.join(uploadsDir, path.basename(rawUrl));
    if (fs.existsSync(candidate)) {
      localFilePath = candidate;
    }
  }

  if (localFilePath) {
    try {
      const fileBuffer = await fs.promises.readFile(localFilePath);
      const ext = path.extname(localFilePath).toLowerCase();
      const mimeTypes = {
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.png': 'image/png',
        '.webp': 'image/webp'
      };
      return {
        media: fileBuffer.toString('base64'),
        mimetype: mimeTypes[ext] || 'image/jpeg',
        fileName: `product${ext || '.jpg'}`
      };
    } catch (e) {
      console.warn('[WhatsApp Alert] Failed to read local file:', e.message);
    }
  }

  // 3. Remote URL
  if (rawUrl.startsWith('http://') || rawUrl.startsWith('https://')) {
    try {
      const res = await fetch(rawUrl, { signal: AbortSignal.timeout(10000) });
      if (res.ok) {
        const buffer = await res.arrayBuffer();
        const contentType = res.headers.get('content-type') || 'image/jpeg';
        let ext = '.jpg';
        if (contentType.includes('png')) ext = '.png';
        else if (contentType.includes('webp')) ext = '.webp';

        return {
          media: Buffer.from(buffer).toString('base64'),
          mimetype: contentType.split(';')[0].trim(),
          fileName: `product${ext}`
        };
      }
    } catch (fetchErr) {
      console.warn('[WhatsApp Alert] Could not fetch remote image buffer, passing direct URL:', fetchErr.message);
    }

    let ext = '.jpg';
    if (rawUrl.toLowerCase().endsWith('.png')) ext = '.png';
    else if (rawUrl.toLowerCase().endsWith('.webp')) ext = '.webp';

    return {
      media: rawUrl,
      mimetype: ext === '.png' ? 'image/png' : (ext === '.webp' ? 'image/webp' : 'image/jpeg'),
      fileName: `product${ext}`
    };
  }

  return null;
}

/**
 * Send a WhatsApp notification (with optional product image) to the configured owner/merchant WhatsApp number(s).
 * @param {string} text - The message content.
 * @param {string|object} [mediaInput] - Optional image URL or media object.
 */
async function sendWhatsAppMessage(text, mediaInput) {
  if (!text) return;

  try {
    const waConfigSetting = await Setting.findOne({ key: 'whatsapp_configs' });
    if (!waConfigSetting || !Array.isArray(waConfigSetting.value)) return;

    const configs = waConfigSetting.value;
    const sentNumbers = new Set();
    const mediaObj = mediaInput ? await prepareMedia(mediaInput) : null;

    for (const conf of configs) {
      const isActive = conf.isActive !== false;
      // Only send inventory/system alerts to merchant/owner configs, NOT customer configs
      if (!isActive || conf.recipientType === 'customer') continue;
      if (!conf.baseUrl || !conf.instance || !conf.apikey || !conf.number) continue;

      let cleanBaseUrl = conf.baseUrl.trim().replace(/\/+$/, '');
      if (!cleanBaseUrl.startsWith('http')) cleanBaseUrl = `https://${cleanBaseUrl}`;

      let cleanNumber = conf.number.trim().replace(/\D/g, '').replace(/^0+/, '');
      if (!cleanNumber.startsWith('20')) {
        cleanNumber = '20' + cleanNumber;
      }

      // Deduplicate: avoid sending identical message multiple times to the exact same phone number
      if (sentNumbers.has(cleanNumber)) {
        continue;
      }
      sentNumbers.add(cleanNumber);

      let finalWaUrl = '';
      const waPayload = {
        number: cleanNumber,
        delay: 1,
        linkPreview: false,
        mentionsEveryOne: false
      };

      if (mediaObj && mediaObj.media) {
        finalWaUrl = `${cleanBaseUrl}/message/sendMedia/${conf.instance}`;
        waPayload.mediatype = 'image';
        waPayload.mediaType = 'image';
        waPayload.caption = text;
        waPayload.media = typeof mediaObj.media === 'string' ? mediaObj.media.replace(/\s/g, '') : mediaObj.media;
        waPayload.mimetype = mediaObj.mimetype || 'image/jpeg';
        waPayload.fileName = mediaObj.fileName || 'product.jpg';
      } else {
        finalWaUrl = `${cleanBaseUrl}/message/sendText/${conf.instance}`;
        waPayload.text = text;
      }

      fetch(finalWaUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': conf.apikey
        },
        body: JSON.stringify(waPayload),
        signal: AbortSignal.timeout(15000)
      })
      .then(async (res) => {
        if (!res.ok) {
          const errText = await res.text().catch(() => '');
          console.warn(`[WhatsApp Alert] Failed to send via ${conf.instance} (${res.status}):`, errText);

          // Fallback to sendText if sendMedia failed
          if (mediaObj && mediaObj.media) {
            const isNoWa = res.status === 400 && (errText.includes('"exists":false') || errText.includes('"exists": false'));
            if (!isNoWa) {
              console.log(`[WhatsApp Alert] Retrying with sendText fallback for ${cleanNumber}...`);
              fetch(`${cleanBaseUrl}/message/sendText/${conf.instance}`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'apikey': conf.apikey
                },
                body: JSON.stringify({
                  number: cleanNumber,
                  text: text,
                  delay: 1
                }),
                signal: AbortSignal.timeout(15000)
              }).catch(err => console.warn('[WhatsApp Alert] Fallback sendText failed:', err.message));
            }
          }
        } else {
          console.log(`[WhatsApp Alert] Successfully sent alert to ${cleanNumber}`);
        }
      })
      .catch((err) => {
        console.warn(`[WhatsApp Alert] Request error via ${conf.instance}:`, err.message);
      });
    }
  } catch (err) {
    console.warn('[WhatsApp Alert] Error reading configs or sending message:', err.message);
  }
}

module.exports = { sendWhatsAppMessage };
