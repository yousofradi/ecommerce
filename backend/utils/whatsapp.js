const Setting = require('../models/Setting');
const { getImageAsPngBase64 } = require('./imageHelper');

/**
 * Send a WhatsApp notification (with optional product image) to the configured owner/merchant WhatsApp number(s).
 * Uses the exact same method as invoice: converts to PNG Base64 and sends via Evolution API sendMedia.
 * @param {string} text - The message content.
 * @param {string|Buffer} [mediaInput] - Optional image URL or buffer.
 */
async function sendWhatsAppMessage(text, mediaInput) {
  if (!text) return;

  try {
    const waConfigSetting = await Setting.findOne({ key: 'whatsapp_configs' });
    if (!waConfigSetting || !Array.isArray(waConfigSetting.value)) return;

    const configs = waConfigSetting.value;
    const sentNumbers = new Set();
    const pngBase64 = mediaInput ? await getImageAsPngBase64(mediaInput) : null;

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

      if (pngBase64) {
        finalWaUrl = `${cleanBaseUrl}/message/sendMedia/${conf.instance}`;
        waPayload.mediatype = 'image';
        waPayload.mediaType = 'image';
        waPayload.mimetype = 'image/png';
        waPayload.caption = text;
        waPayload.media = pngBase64.replace(/\s/g, '');
        waPayload.fileName = 'product.png';
      } else {
        finalWaUrl = `${cleanBaseUrl}/message/sendText/${conf.instance}`;
        waPayload.text = text;
      }

      console.log(`[WhatsApp Alert] Sending to ${finalWaUrl} (target: ${cleanNumber}, hasImage: ${!!pngBase64})`);

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
        const rawText = await res.text().catch(() => '');
        if (!res.ok) {
          console.warn(`[WhatsApp Alert] Failed to send via ${conf.instance} (${res.status}):`, rawText);

          // Fallback to sendText if sendMedia failed
          if (pngBase64) {
            const isNoWa = res.status === 400 && (rawText.includes('"exists":false') || rawText.includes('"exists": false'));
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
