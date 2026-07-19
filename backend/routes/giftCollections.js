const express = require('express');
const router = express.Router();
const GiftCollection = require('../models/GiftCollection');
const adminAuth = require('../middleware/adminAuth');

// ── GET all collections ──────────────────────────────────────
router.get('/', adminAuth, async (req, res) => {
  try {
    const collections = await GiftCollection.find().sort({ createdAt: -1 });
    res.json(collections);
  } catch (error) {
    console.error('Error fetching gift collections:', error);
    res.status(500).json({ error: 'Failed to fetch gift collections' });
  }
});

// ── POST create collection ──────────────────────────────────
router.post('/', adminAuth, async (req, res) => {
  try {
    const { name, products } = req.body;
    if (!name) return res.status(400).json({ error: 'Name is required' });

    const newCollection = new GiftCollection({ name, products: products || [] });
    await newCollection.save();
    res.json(newCollection);
  } catch (error) {
    console.error('Error creating gift collection:', error);
    res.status(500).json({ error: 'Failed to create gift collection' });
  }
});

// ── PUT update collection ───────────────────────────────────
router.put('/:id', adminAuth, async (req, res) => {
  try {
    const { name, products } = req.body;
    const updated = await GiftCollection.findByIdAndUpdate(
      req.params.id,
      { name, products },
      { new: true, runValidators: true }
    );
    if (!updated) return res.status(404).json({ error: 'Gift collection not found' });
    res.json(updated);
  } catch (error) {
    console.error('Error updating gift collection:', error);
    res.status(500).json({ error: 'Failed to update gift collection' });
  }
});

// ── DELETE collection ───────────────────────────────────────
router.delete('/:id', adminAuth, async (req, res) => {
  try {
    const deleted = await GiftCollection.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ error: 'Gift collection not found' });
    res.json({ success: true, message: 'Gift collection deleted' });
  } catch (error) {
    console.error('Error deleting gift collection:', error);
    res.status(500).json({ error: 'Failed to delete gift collection' });
  }
});

module.exports = router;
