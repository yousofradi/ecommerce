const express = require('express');
const router = express.Router();
const Product = require('../models/Product');
const adminAuth = require('../middleware/adminAuth');
const multer = require('multer');
const csv = require('csv-parser');
const fs = require('fs');
const path = require('path');

const upload = multer({ dest: 'uploads/' });

// ── Caching ──────────────────────────────────────────────
let productCache = new Map();
const CACHE_DURATION = 5 * 60 * 1000; // 5 mins

function clearCache() {
  productCache.clear();
}

// ── Public ──────────────────────────────────────────────

// GET /api/products — list all (with pagination & collection filter)
router.get('/', async (req, res) => {
  try {
    const { page, limit, admin, collectionId, search } = req.query;
    
    // Simple caching for public requests
    const cacheKey = JSON.stringify({ page, limit, admin, collectionId, search });
    if (admin !== 'true' && productCache.has(cacheKey)) {
      const cached = productCache.get(cacheKey);
      if (Date.now() - cached.time < CACHE_DURATION) {
        return res.json(cached.data);
      }
    }

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
    
    // Optimization: Don't fetch description for listings (it's only needed for details page)
    const fieldsToSelect = admin === 'true' ? '' : '-description';

    if (page || limit) {
      const pageNum = parseInt(page) || 1;
      const limitNum = parseInt(limit) || 20;
      const skip = (pageNum - 1) * limitNum;
      
      const [products, total] = await Promise.all([
        Product.find(query).select(fieldsToSelect).sort(sortObj).skip(skip).limit(limitNum),
        Product.countDocuments(query)
      ]);
      
      const result = {
        products,
        total,
        page: pageNum,
        totalPages: Math.ceil(total / limitNum)
      };

      if (admin !== 'true') {
        const cacheKey = JSON.stringify({ page, limit, admin, collectionId, search });
        productCache.set(cacheKey, { data: result, time: Date.now() });
      }
      
      res.json(result);
    } else {
      // For non-paginated requests (like the home page), still apply a reasonable limit of 100
      // unless it's an admin request.
      const queryExec = Product.find(query).select(fieldsToSelect).sort(sortObj);
      if (admin !== 'true') {
        queryExec.limit(100); 
      }
      const products = await queryExec;
      if (admin !== 'true') {
        const cacheKey = JSON.stringify({ page, limit, admin, collectionId, search });
        productCache.set(cacheKey, { data: products, time: Date.now() });
      }
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
    clearCache();
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
    clearCache();
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
    clearCache();
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
    clearCache();
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
    clearCache();
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
    clearCache();
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
    
    clearCache();
    res.json({ message: 'Product collections updated successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update product collections' });
  }
});

// POST /api/products/import — Bulk Import
router.post('/import', adminAuth, upload.single('file'), async (req, res) => {
  try {
    const { deleteAll } = req.body;
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    const cleanPrice = (val) => {
      if (val === null || val === undefined || val === '') return null;
      const cleaned = val.toString().replace(/[^\d.]/g, '');
      return cleaned === '' ? 0 : parseFloat(cleaned);
    };

    if (deleteAll === 'true') {
      await Product.deleteMany({});
      clearCache();
    }

    // Get all collections to map names
    const Collection = require('../models/Collection');
    const collections = await Collection.find({});
    const collectionMap = {};
    collections.forEach(c => {
      collectionMap[c.name.trim()] = c._id;
    });

    const productsMap = new Map();
    let lastProduct = null;

    const results = [];
    const stream = fs.createReadStream(req.file.path).pipe(csv());

    for await (const row of stream) {
      const title = row['Title'] ? row['Title'].trim() : '';
      
      if (title) {
        // Start a new product
        const product = {
          name: title,
          description: row['Description'] || '',
          basePrice: cleanPrice(row['Regular Price']),
          salePrice: row['Sale Price'] ? cleanPrice(row['Sale Price']) : null,
          imageUrl: '',
          images: [],
          status: (row['Status'] || 'active').toLowerCase(),
          quantity: row['Quantity'] === 'Available' ? null : (parseInt(row['Quantity']) || 0),
          collectionIds: [],
          options: []
        };

        // Handle images
        if (row['Images']) {
          const imgs = row['Images'].split(' ').filter(url => url.startsWith('http'));
          product.images = imgs;
          product.imageUrl = imgs[0] || '';
        }

        // Handle collections
        if (row['Collections']) {
          const names = row['Collections'].split(',').map(n => n.trim());
          names.forEach(name => {
            if (collectionMap[name]) {
              product.collectionIds.push(collectionMap[name]);
            }
          });
        }

        productsMap.set(title, product);
        lastProduct = product;
      }

      // Handle Options (Option1, Option2, Option3)
      if (lastProduct) {
        for (let i = 1; i <= 3; i++) {
          const optName = row[`Option${i} Name`] ? row[`Option${i} Name`].trim() : '';
          const optValue = row[`Option${i} Value`] ? row[`Option${i} Value`].trim() : '';

          if (optName && optValue) {
            let group = lastProduct.options.find(g => g.name === optName);
            if (!group) {
              group = { name: optName, values: [] };
              lastProduct.options.push(group);
            }

            // Option pricing: use row prices if available, otherwise fallback to product prices
            const price = row['Regular Price'] ? cleanPrice(row['Regular Price']) : lastProduct.basePrice;
            const sPrice = row['Sale Price'] ? cleanPrice(row['Sale Price']) : lastProduct.salePrice;

            // Avoid duplicates in the same group
            if (!group.values.find(v => v.label === optValue)) {
              group.values.push({
                label: optValue,
                price: price,
                salePrice: sPrice
              });
            }
          }
        }
      }
    }

    // Now Upsert products
    const finalProducts = Array.from(productsMap.values());
    for (const pData of finalProducts) {
      // Find current count if creating new
      if (deleteAll !== 'true') {
         const existing = await Product.findOne({ name: pData.name });
         if (!existing) {
           pData.sortOrder = await Product.countDocuments();
         }
      } else {
        pData.sortOrder = results.length;
        results.push(pData);
      }
      
      await Product.findOneAndUpdate(
        { name: pData.name },
        pData,
        { upsert: true, new: true, runValidators: true }
      );
    }

    // Cleanup file
    if (fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    clearCache();

    res.json({ message: `Successfully processed ${finalProducts.length} products` });

  } catch (err) {
    console.error('Import error:', err);
    if (req.file && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
    }
    res.status(500).json({ error: 'Import failed: ' + err.message });
  }
});

module.exports = router;
