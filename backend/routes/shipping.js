const express = require('express');
const router = express.Router();
const Shipping = require('../models/Shipping');
const { requireAdmin } = require('../middleware/auth');
const defaultShippingFees = require('../config/shipping');

// GET /api/shipping — return all shipping fees (or seed if empty)
router.get('/', async (req, res) => {
  try {
    let fees = await Shipping.find();
    if (fees.length === 0) {
      // Seed default
      const seedData = Object.entries(defaultShippingFees).map(([gov, fee]) => ({ governorate: gov, fee }));
      await Shipping.insertMany(seedData);
      fees = await Shipping.find();
    }
    
    // Return map format for frontend compatibility
    const map = {};
    fees.forEach(f => { map[f.governorate] = f.fee; });
    res.json(map);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Admin: Get raw DB objects
router.get('/list', requireAdmin, async (req, res) => {
  try {
    const fees = await Shipping.find().sort({ governorate: 1 });
    res.json(fees);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Admin: Update fee
router.put('/:id', requireAdmin, async (req, res) => {
  try {
    const shipping = await Shipping.findByIdAndUpdate(req.params.id, { fee: req.body.fee }, { new: true });
    res.json(shipping);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Admin: Add new governorate
router.post('/', requireAdmin, async (req, res) => {
  try {
    const shipping = new Shipping(req.body);
    await shipping.save();
    res.json(shipping);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Admin: Delete governorate
router.delete('/:id', requireAdmin, async (req, res) => {
  try {
    await Shipping.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
