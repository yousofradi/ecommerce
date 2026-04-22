/**
 * Webhook utility — sends POST to WEBHOOK_URL.
 * Fire-and-forget: logs errors but never blocks the response.
 */
const Webhook = require('../models/Webhook');
const cityMap = require('./cityMap');

async function sendWebhook(event, data) {
  try {
    const webhooks = await Webhook.find({ active: true, events: event });
    if (webhooks.length === 0) return;

    // Calculate subamount if needed
    const subamount = data.totalPrice - data.shippingFee;
    
    // Map product items
    const products = (data.items || []).map(item => ({
      "name": item.name,
      "count": item.quantity,
      "price": item.finalPrice / item.quantity,
      "value option": (item.selectedOptions || []).map(o => o.label).join(' / ') || ""
    }));

    const rawPayload = {
      "Order ID": data.orderId,
      "Name": data.customer.name,
      "Phone": data.customer.phone,
      "Second Phone": data.customer.secondPhone || "",
      "Address": data.customer.address,
      "Gov-ar": data.customer.government,
      "Gov-en": cityMap[data.customer.government] || data.customer.government,
      "notes": data.customer.notes || "",
      "subamount": subamount,
      "shipment-amount": data.shippingFee,
      "total amount": data.totalPrice,
      "paid amount": data.paidAmount || 0,
      "remaining amount": data.totalPrice - (data.paidAmount || 0),
      "products": products
    };

    const payload = JSON.stringify({
      event,
      timestamp: new Date().toISOString(),
      data: rawPayload
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
