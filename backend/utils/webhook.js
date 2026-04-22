/**
 * Webhook utility — sends POST to WEBHOOK_URL.
 * Fire-and-forget: logs errors but never blocks the response.
 */
const Webhook = require('../models/Webhook');

async function sendWebhook(event, data) {
  try {
    const webhooks = await Webhook.find({ active: true });
    if (webhooks.length === 0) return;

    const payload = JSON.stringify({
      event,
      timestamp: new Date().toISOString(),
      data
    });

    const promises = webhooks.map(wh => 
      fetch(wh.url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: payload,
        signal: AbortSignal.timeout(5000)
      }).catch(err => {
        console.error(`Failed to send webhook to ${wh.url}:`, err.message);
      })
    );

    await Promise.all(promises);
  } catch (err) {
    console.error('Webhook system error:', err.message);
  }
}

module.exports = sendWebhook;
