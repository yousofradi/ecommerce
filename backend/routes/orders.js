const express = require('express');
const router = express.Router();
const Order = require('../models/Order');
const adminAuth = require('../middleware/adminAuth');
const sendWebhook = require('../utils/webhook');
const shippingFees = require('../config/shipping');

// ── Public ──────────────────────────────────────────────

// POST /api/orders — create order
router.post('/', async (req, res) => {
  try {
    const { customer, items, paymentMethod } = req.body;

    // Validate required fields
    if (!customer || !items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Customer info and at least one item are required' });
    }
    if (!customer.name || !customer.phone || !customer.address || !customer.government) {
      return res.status(400).json({ error: 'Customer name, phone, address, and government are required' });
    }
    if (!paymentMethod || !['instapay', 'vodafone_cash'].includes(paymentMethod)) {
      return res.status(400).json({ error: 'Valid payment method is required (instapay or vodafone_cash)' });
    }

    // Calculate shipping fee
    const shippingFee = shippingFees[customer.government];
    if (shippingFee == null) {
      return res.status(400).json({ error: `Unknown government: ${customer.government}` });
    }

    // Calculate total price
    let subtotal = 0;
    for (const item of items) {
      const optionsPrice = (item.selectedOptions || []).reduce((sum, opt) => sum + (opt.price || 0), 0);
      item.finalPrice = (item.basePrice + optionsPrice) * item.quantity;
      subtotal += item.finalPrice;
    }

    const totalPrice = subtotal + shippingFee;

    const order = new Order({
      customer,
      items,
      totalPrice,
      shippingFee,
      paymentMethod
    });

    await order.save();

    // Fire webhook (non-blocking)
    sendWebhook('order.created', order.toObject());

    res.status(201).json(order);
  } catch (err) {
    console.error('Order creation error:', err);
    if (err.name === 'ValidationError') {
      return res.status(400).json({ error: err.message });
    }
    res.status(500).json({ error: 'Failed to create order' });
  }
});

// ── Admin ───────────────────────────────────────────────

// GET /api/orders — list all
router.get('/', adminAuth, async (req, res) => {
  try {
    const orders = await Order.find().sort({ createdAt: -1 });
    res.json(orders);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch orders' });
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

    // Recalculate total if items changed
    if (updates.items && Array.isArray(updates.items)) {
      let subtotal = 0;
      for (const item of updates.items) {
        const optionsPrice = (item.selectedOptions || []).reduce((sum, opt) => sum + (opt.price || 0), 0);
        item.finalPrice = (item.basePrice + optionsPrice) * item.quantity;
        subtotal += item.finalPrice;
      }
      // Recalculate shipping if government changed
      if (updates.customer && updates.customer.government) {
        const fee = shippingFees[updates.customer.government];
        if (fee != null) updates.shippingFee = fee;
      }
      updates.totalPrice = subtotal + (updates.shippingFee || 0);
    }

    const order = await Order.findOneAndUpdate(
      { orderId: req.params.orderId },
      { $set: updates },
      { new: true, runValidators: true }
    );

    if (!order) return res.status(404).json({ error: 'Order not found' });

    // Fire webhook (non-blocking)
    sendWebhook('order.updated', order.toObject());

    res.json(order);
  } catch (err) {
    if (err.name === 'ValidationError') {
      return res.status(400).json({ error: err.message });
    }
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
