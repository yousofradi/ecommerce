const Setting = require('../models/Setting');

/**
 * Send a WhatsApp text notification to the configured owner/merchant WhatsApp number(s).
 * @param {string} text - The message content.
 */
async function sendWhatsAppMessage(text) {
  if (!text) return;

  try {
    const waConfigSetting = await Setting.findOne({ key: 'whatsapp_configs' });
    if (!waConfigSetting || !Array.isArray(waConfigSetting.value)) return;

    const configs = waConfigSetting.value;
    const sentNumbers = new Set();

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

      const finalWaUrl = `${cleanBaseUrl}/message/sendText/${conf.instance}`;
      const waPayload = {
        number: cleanNumber,
        text: text,
        delay: 1,
        linkPreview: false,
        mentionsEveryOne: false
      };

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
