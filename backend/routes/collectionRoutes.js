const express = require('express');
const router = express.Router();
const collectionController = require('../controllers/collectionController');
const adminAuth = require('../middleware/adminAuth');

const cache = require('../utils/cache');

router.get('/', async (req, res, next) => {
  const isAdmin = req.query.admin === 'true' || !!req.headers['x-admin-key'] || !!req.query.adminKey;
  const cacheKey = 'storefront:collections:list';

  if (!isAdmin) {
    res.setHeader('Cache-Control', 'public, max-age=60, s-maxage=300, stale-while-revalidate=600');
    const cached = await cache.get(cacheKey);
    if (cached) {
      return res.json(cached);
    }
  } else {
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  }
  
  // Intercept the response to cache it
  const originalJson = res.json;
  res.json = function(data) {
    if (!isAdmin && (!res.statusCode || (res.statusCode >= 200 && res.statusCode < 300))) {
      cache.set(cacheKey, data);
    }
    return originalJson.call(this, data);
  };
  
  next();
}, collectionController.getCollections);

router.get('/:id', async (req, res, next) => {
  const isAdmin = req.query.admin === 'true' || !!req.headers['x-admin-key'] || !!req.query.adminKey;
  const isFresh = !!(req.query._t || req.query.fresh === 'true' || req.query.useCache === 'false');
  const rawId = req.params.id;
  let decodedId = rawId;
  try { decodedId = decodeURIComponent(rawId); } catch (e) {}
  const cacheKey = `storefront:collection:id:${decodedId}`;

  if (!isAdmin && !isFresh) {
    res.setHeader('Cache-Control', 'public, max-age=60, s-maxage=300, stale-while-revalidate=600');
    const cached = await cache.get(cacheKey);
    if (cached) {
      return res.json(cached);
    }
  } else {
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  }
  
  // Intercept the response to cache it
  const originalJson = res.json;
  res.json = function(data) {
    if (!isAdmin && (!res.statusCode || (res.statusCode >= 200 && res.statusCode < 300))) {
      cache.set(cacheKey, data, 300);
      if (rawId !== decodedId) {
        cache.set(`storefront:collection:id:${rawId}`, data, 300);
      }
    }
    return originalJson.call(this, data);
  };
  
  next();
}, collectionController.getCollection);

// Admin only routes
router.post('/delete/batch', adminAuth, async (req, res, next) => {
  await cache.del('storefront:collections:list');
  await cache.clearPrefix('storefront:collection:').catch(() => {});
  await cache.delPattern('storefront:collection:*').catch(() => {});
  next();
}, collectionController.deleteCollectionsBatch);

router.post('/', adminAuth, async (req, res, next) => {
  await cache.del('storefront:collections:list');
  await cache.clearPrefix('storefront:collection:').catch(() => {});
  await cache.delPattern('storefront:collection:*').catch(() => {});
  next();
}, collectionController.createCollection);

router.put('/:id', adminAuth, async (req, res, next) => {
  await cache.del('storefront:collections:list');
  await cache.del(`storefront:collection:id:${req.params.id}`);
  await cache.clearPrefix('storefront:collection:').catch(() => {});
  await cache.delPattern('storefront:collection:*').catch(() => {});
  next();
}, collectionController.updateCollection);

router.delete('/:id', adminAuth, async (req, res, next) => {
  await cache.del('storefront:collections:list');
  await cache.del(`storefront:collection:id:${req.params.id}`);
  await cache.clearPrefix('storefront:collection:').catch(() => {});
  await cache.delPattern('storefront:collection:*').catch(() => {});
  next();
}, collectionController.deleteCollection);

router.put('/reorder/batch', adminAuth, async (req, res, next) => {
  await cache.del('storefront:collections:list');
  await cache.clearPrefix('storefront:collection:').catch(() => {});
  await cache.delPattern('storefront:collection:*').catch(() => {});
  next();
}, collectionController.reorderCollectionsBatch);

module.exports = { router };
