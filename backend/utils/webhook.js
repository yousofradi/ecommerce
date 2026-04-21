/**
 * Webhook utility — sends POST to WEBHOOK_URL.
 * Fire-and-forget: logs errors but never blocks the response.
 */
const sendWebhook = async (event, data) => {
  const url = process.env.WEBHOOK_URL;
  if (!url) {
    console.log(`ℹ️  Webhook skipped (WEBHOOK_URL not set) — event: ${event}`);
    return;
  }

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event, data, timestamp: new Date().toISOString() })
    });
    console.log(`🔔 Webhook sent: ${event} — status: ${response.status}`);
  } catch (err) {
    console.error(`❌ Webhook failed: ${event} —`, err.message);
  }
};

module.exports = sendWebhook;
