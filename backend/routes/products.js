const express = require('express');
const router = express.Router();
const Product = require('../models/Product');
const adminAuth = require('../middleware/adminAuth');

// ── Public ──────────────────────────────────────────────

// GET /api/products — list all (with pagination & collection filter)
router.get('/', async (req, res) => {
  try {
    const { page, limit, admin, collectionId, search } = req.query;
    const query = {};
    
    // If not admin request, only show active products
    if (admin !== 'true') {
      query.active = { $ne: false };
      query.status = { $ne: 'draft' };
      // Hide out-of-stock products (quantity === 0) from storefront
      // quantity: null or undefined means unlimited
      query.$and = [
        { $or: [{ quantity: null }, { quantity: { $gt: 0 } }] }
      ];
    }

    // Server-side search by name
    if (search) {
      query.name = { $regex: search, $options: 'i' };
    }

    // Filter by collection
    if (collectionId) {
      const colFilter = {
        $or: [
          { collectionId: collectionId },
          { collectionIds: collectionId }
        ]
      };
      // Merge with existing $and if present
      if (query.$and) {
        query.$and.push(colFilter);
      } else {
        query.$and = [colFilter];
      }
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
      res.json(products);
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

// GET /api/products/handle/:handle — single product by handle
router.get('/handle/:handle', async (req, res) => {
  try {
    const product = await Product.findOne({ handle: req.params.handle });
    if (!product) return res.status(404).json({ error: 'Product not found' });
    res.json(product);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch product by handle' });
  }
});

// ── Admin ───────────────────────────────────────────────

// POST /api/products — create
router.post('/', adminAuth, async (req, res) => {
  try {
    const { name, basePrice, salePrice, imageUrl, images, description, options, status, quantity, handle, collectionId, collectionIds } = req.body;

    if (!name || basePrice == null) {
      return res.status(400).json({ error: 'Name and basePrice are required' });
    }

    const count = await Product.countDocuments();
    const product = new Product({ 
      name, basePrice, salePrice, imageUrl, images, description, options, 
      sortOrder: count, status, quantity, handle, collectionId, collectionIds 
    });
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
    const { name, basePrice, salePrice, imageUrl, images, description, options, active, status, quantity, handle, collectionId, collectionIds } = req.body;

    const updateData = { name, basePrice, imageUrl, images, description, options };
    if (salePrice !== undefined) updateData.salePrice = salePrice;
    if (active !== undefined) updateData.active = active;
    if (status !== undefined) updateData.status = status;
    if (quantity !== undefined) updateData.quantity = quantity;
    if (handle !== undefined) updateData.handle = handle;
    if (collectionId !== undefined) updateData.collectionId = collectionId;
    if (collectionIds !== undefined) updateData.collectionIds = collectionIds;

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
    await Product.updateMany(
      { _id: { $in: productIds } },
      { $set: { active: false, status: 'draft' } }
    );
    res.json({ message: 'Products deactivated successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to deactivate products' });
  }
});

// PUT /api/products/reorder/batch — reorder products
router.put('/reorder/batch', adminAuth, async (req, res) => {
  try {
    const { order } = req.body;
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

// PUT /api/products/collection/batch — bulk update collection
router.put('/collection/batch', adminAuth, async (req, res) => {
  try {
    const { productIds, collectionId, action } = req.body;
    if (!Array.isArray(productIds)) return res.status(400).json({ error: 'productIds must be an array' });
    
    if (action === 'add') {
      await Product.updateMany(
        { _id: { $in: productIds } },
        { $addToSet: { collectionIds: collectionId } }
      );
    } else if (action === 'remove') {
      await Product.updateMany(
        { _id: { $in: productIds } },
        { $pull: { collectionIds: collectionId } }
      );
    } else if (action === 'set') {
       // First remove this collection from all products that have it
       await Product.updateMany(
        { collectionIds: collectionId },
        { $pull: { collectionIds: collectionId } }
       );
       // Then add it only to the specified products
       if (productIds.length > 0) {
         await Product.updateMany(
           { _id: { $in: productIds } },
           { $addToSet: { collectionIds: collectionId } }
         );
       }
    } else {
      return res.status(400).json({ error: 'invalid action' });
    }
    
    res.json({ message: 'Product collections updated successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update product collections' });
  }
});

module.exports = router;
