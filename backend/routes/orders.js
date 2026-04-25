const express = require('express');
const router = express.Router();
const Order = require('../models/Order');
const adminAuth = require('../middleware/adminAuth');
const sendWebhook = require('../utils/webhook');

// Helper: recalculate totals from items + shipping + discount
function calcTotals(items, shippingFee, orderDiscount = 0) {
  let subtotal = 0;
  for (const item of items) {
    const optionsPrice = (item.selectedOptions || []).reduce((s, o) => s + (o.price || 0), 0);
    const itemDiscount = item.discount || 0;
    item.finalPrice = Math.max(0, ((item.basePrice + optionsPrice) * item.quantity) - itemDiscount);
    subtotal += item.finalPrice;
  }
  const totalPrice = Math.max(0, subtotal + shippingFee - orderDiscount);
  return { subtotal, totalPrice };
}

// ── Public ──────────────────────────────────────────────

// POST /api/orders — create order (public from storefront OR admin)
router.post('/', async (req, res) => {
  try {
    const { customer, items, paymentMethod, discount = 0, paidAmount = 0 } = req.body;

    if (!customer || !items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Customer info and at least one item are required' });
    }
    if (!customer.name || !customer.phone || !customer.address || !customer.government) {
      return res.status(400).json({ error: 'Customer name, phone, address, and government are required' });
    }
    if (!paymentMethod || !['instapay', 'vodafone_cash'].includes(paymentMethod)) {
      return res.status(400).json({ error: 'Valid payment method is required' });
    }

    // Shipping fee: try DB first, fall back to static config
    let shippingFee = 0;
    try {
      const Shipping = require('../models/Shipping');
      const record = await Shipping.findOne({ governorate: customer.government });
      if (record) {
        shippingFee = record.fee;
      } else {
        const defaultFees = require('../config/shipping');
        shippingFee = defaultFees[customer.government] || 0;
      }
    } catch (e) {
      const defaultFees = require('../config/shipping');
      shippingFee = defaultFees[customer.government] || 0;
    }

    if (shippingFee === 0 && !customer.government) {
      return res.status(400).json({ error: `Unknown government: ${customer.government}` });
    }

    const { totalPrice } = calcTotals(items, shippingFee, discount);

    const Counter = require('../models/Counter');
    const counter = await Counter.findByIdAndUpdate(
      'orderSeq',
      { $inc: { seq: 1 } },
      { new: true, upsert: true }
    );
    const generatedOrderId = `Scoop-${counter.seq}`;

    const order = new Order({
      orderId: generatedOrderId,
      customer,
      items,
      discount,
      totalPrice,
      shippingFee,
      paymentMethod,
      paidAmount: Number(paidAmount) || 0,
      paid: (Number(paidAmount) || 0) >= totalPrice
    });

    await order.save();
    sendWebhook('order.created', order.toObject());
    res.status(201).json(order);
  } catch (err) {
    console.error('Order creation error:', err);
    if (err.name === 'ValidationError') return res.status(400).json({ error: err.message });
    res.status(500).json({ error: 'Failed to create order' });
  }
});

// ── Admin ───────────────────────────────────────────────

// GET /api/orders — list all
router.get('/', adminAuth, async (req, res) => {
  try {
    const { archived } = req.query;
    const query = {};
    if (archived === 'true') {
      query.archived = true;
    } else {
      query.archived = { $ne: true };
    }
    const orders = await Order.find(query).sort({ createdAt: -1 });
    res.json(orders);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
});

// POST /api/orders/archive/batch — archive multiple orders
router.post('/archive/batch', adminAuth, async (req, res) => {
  try {
    const { orderIds } = req.body;
    if (!Array.isArray(orderIds)) return res.status(400).json({ error: 'orderIds must be an array' });
    
    await Order.updateMany(
      { orderId: { $in: orderIds } },
      { $set: { archived: true } }
    );
    res.json({ message: 'Orders archived successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to archive orders' });
  }
});

// GET /api/orders/:orderId — single order
router.get('/:orderId', adminAuth, async (req, res) => {
  try {
    const order = await Order.findOne({ orderId: req.params.orderId });
    if (!order) return res.status(404).json({ error: 'Order not found' });
    res.json(order);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch order' });
  }
});

// PUT /api/orders/:orderId — update order
router.put('/:orderId', adminAuth, async (req, res) => {
  try {
    const updates = req.body;
    const oldOrder = await Order.findOne({ orderId: req.params.orderId });
    if (!oldOrder) return res.status(404).json({ error: 'Order not found' });

    // Recalculate totals if items or discount changed
    if (updates.items && Array.isArray(updates.items)) {
      let shippingFee = oldOrder.shippingFee;
      if (updates.customer && updates.customer.government) {
        try {
          const Shipping = require('../models/Shipping');
          const record = await Shipping.findOne({ governorate: updates.customer.government });
          if (record) shippingFee = record.fee;
        } catch (e) {}
      }
      updates.shippingFee = shippingFee;
      const { totalPrice } = calcTotals(updates.items, shippingFee, updates.discount || 0);
      updates.totalPrice = totalPrice;
    } else if (updates.discount !== undefined) {
      // Only discount changed — recalculate from existing items
      const { totalPrice } = calcTotals(
        updates.items || oldOrder.items,
        updates.shippingFee || oldOrder.shippingFee,
        updates.discount
      );
      updates.totalPrice = totalPrice;
    }

    const order = await Order.findOneAndUpdate(
      { orderId: req.params.orderId },
      { $set: updates },
      { new: true, runValidators: true }
    );

    if (updates.forcePaymentWebhook || oldOrder.paidAmount !== order.paidAmount) {
      sendWebhook('order.paid', order.toObject());
    } else if (!oldOrder.paid && order.paid) {
      sendWebhook('order.paid', order.toObject());
    }

    res.json(order);
  } catch (err) {
    if (err.name === 'ValidationError') return res.status(400).json({ error: err.message });
    res.status(500).json({ error: 'Failed to update order' });
  }
});

// DELETE /api/orders/:orderId — delete order
router.delete('/:orderId', adminAuth, async (req, res) => {
  try {
    const order = await Order.findOneAndDelete({ orderId: req.params.orderId });
    if (!order) return res.status(404).json({ error: 'Order not found' });
    res.json({ message: 'Order deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete order' });
  }
});

module.exports = router;
