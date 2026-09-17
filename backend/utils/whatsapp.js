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
    for (const conf of configs) {
      const isActive = conf.isActive !== false;
      if (!isActive || !conf.baseUrl || !conf.instance || !conf.apikey || !conf.number) continue;

      let cleanBaseUrl = conf.baseUrl.trim().replace(/\/+$/, '');
      if (!cleanBaseUrl.startsWith('http')) cleanBaseUrl = `https://${cleanBaseUrl}`;

      let cleanNumber = conf.number.trim().replace(/\D/g, '').replace(/^0+/, '');
      if (!cleanNumber.startsWith('20')) {
        cleanNumber = '20' + cleanNumber;
      }

      // Random message delay between 30 seconds and 1 minute (30,000ms to 60,000ms)
      const randomDelayMs = Math.floor(Math.random() * (60000 - 30000 + 1)) + 30000;

      const finalWaUrl = `${cleanBaseUrl}/message/sendText/${conf.instance}`;
      const waPayload = {
        number: cleanNumber,
        text: text,
        delay: randomDelayMs,
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
        signal: AbortSignal.timeout(90000)
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
