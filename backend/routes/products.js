const express = require('express');
const router = express.Router();
const Product = require('../models/Product');
const adminAuth = require('../middleware/adminAuth');

// ── Public ──────────────────────────────────────────────

// GET /api/products — list all
router.get('/', async (req, res) => {
  try {
    const products = await Product.find().sort({ sortOrder: 1, createdAt: -1 });
    res.json(products);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch products' });
  }
});

// GET /api/products/:id — single product
router.get('/:id', async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ error: 'Product not found' });
    res.json(product);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch product' });
  }
});

// ── Admin ───────────────────────────────────────────────

// POST /api/products — create
router.post('/', adminAuth, async (req, res) => {
  try {
    const { name, basePrice, imageUrl, description, options } = req.body;

    if (!name || basePrice == null) {
      return res.status(400).json({ error: 'Name and basePrice are required' });
    }

    const count = await Product.countDocuments();
    const product = new Product({ name, basePrice, imageUrl, description, options, sortOrder: count });
    await product.save();
    res.status(201).json(product);
  } catch (err) {
    if (err.name === 'ValidationError') {
      return res.status(400).json({ error: err.message });
    }
    res.status(500).json({ error: 'Failed to create product' });
  }
});

// PUT /api/products/:id — update
router.put('/:id', adminAuth, async (req, res) => {
  try {
    const { name, basePrice, imageUrl, description, options } = req.body;

    const product = await Product.findByIdAndUpdate(
      req.params.id,
      { name, basePrice, imageUrl, description, options },
      { new: true, runValidators: true }
    );

    if (!product) return res.status(404).json({ error: 'Product not found' });
    res.json(product);
  } catch (err) {
    if (err.name === 'ValidationError') {
      return res.status(400).json({ error: err.message });
    }
    res.status(500).json({ error: 'Failed to update product' });
  }
});

// DELETE /api/products/:id — delete
router.delete('/:id', adminAuth, async (req, res) => {
  try {
    const product = await Product.findByIdAndDelete(req.params.id);
    if (!product) return res.status(404).json({ error: 'Product not found' });
    res.json({ message: 'Product deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete product' });
  }
});

// PUT /api/products/reorder — reorder products
router.put('/reorder/batch', adminAuth, async (req, res) => {
  try {
    const { order } = req.body; // array of { id, sortOrder }
    if (!order || !Array.isArray(order)) {
      return res.status(400).json({ error: 'order array is required' });
    }
    const ops = order.map(item => ({
      updateOne: {
        filter: { _id: item.id },
        update: { $set: { sortOrder: item.sortOrder } }
      }
    }));
    await Product.bulkWrite(ops);
    res.json({ message: 'Products reordered' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to reorder products' });
  }
});

module.exports = router;
