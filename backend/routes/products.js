const express = require('express');
const router = express.Router();
const Product = require('../models/Product');
const adminAuth = require('../middleware/adminAuth');

// ── Public ──────────────────────────────────────────────

// GET /api/products — list all (with pagination)
router.get('/', async (req, res) => {
  try {
    const { page, limit, admin } = req.query;
    const query = {};
    
    // If not admin request or explicitly requesting active only, filter inactive
    if (admin !== 'true') {
      query.active = { $ne: false };
    }

    const sortObj = { sortOrder: 1, createdAt: -1 };

    if (page || limit) {
      const pageNum = parseInt(page) || 1;
      const limitNum = parseInt(limit) || 20;
      const skip = (pageNum - 1) * limitNum;
      
      const [products, total] = await Promise.all([
        Product.find(query).sort(sortObj).skip(skip).limit(limitNum),
        Product.countDocuments(query)
      ]);
      
      res.json({
        products,
        total,
        page: pageNum,
        totalPages: Math.ceil(total / limitNum)
      });
    } else {
      const products = await Product.find(query).sort(sortObj);
      res.json(products); // fallback for existing frontend apps that expect array
    }
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
    const { name, basePrice, imageUrl, description, options, active } = req.body;

    const updateData = { name, basePrice, imageUrl, description, options };
    if (active !== undefined) updateData.active = active;

    const product = await Product.findByIdAndUpdate(
      req.params.id,
      updateData,
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

// POST /api/products/delete/batch — bulk delete
router.post('/delete/batch', adminAuth, async (req, res) => {
  try {
    const { productIds } = req.body;
    if (!Array.isArray(productIds)) return res.status(400).json({ error: 'productIds must be an array' });
    await Product.deleteMany({ _id: { $in: productIds } });
    res.json({ message: 'Products deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete products' });
  }
});

// POST /api/products/deactivate/batch — bulk deactivate
router.post('/deactivate/batch', adminAuth, async (req, res) => {
  try {
    const { productIds } = req.body;
    if (!Array.isArray(productIds)) return res.status(400).json({ error: 'productIds must be an array' });
    
    // Toggle active status: this could just set it to false, or toggle.
    // The requirement says "deactivate", so we set it to false.
    await Product.updateMany(
      { _id: { $in: productIds } },
      { $set: { active: false } }
    );
    res.json({ message: 'Products deactivated successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to deactivate products' });
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
