const Collection = require('../models/Collection');
const { optimizeCloudinaryUrl } = require('../utils/cloudinary');
const cache = require('../utils/cache');

exports.getCollections = async (req, res) => {
  try {
    const collections = await Collection.find().sort({ sortOrder: 1, createdAt: -1 }).lean();
    collections.forEach(c => {
      if (c.imageUrl) c.imageUrl = optimizeCloudinaryUrl(c.imageUrl);
    });
    res.json(collections);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getCollection = async (req, res) => {
  try {
    const { id } = req.params;
    let collection;
    
    // Check if ID is a valid MongoDB ObjectId
    if (id.match(/^[0-9a-fA-F]{24}$/)) {
      collection = await Collection.findById(id).lean();
    } else {
      // Otherwise search by handle/urlName
      collection = await Collection.findOne({ urlName: id }).lean();
    }

    if (!collection) return res.status(404).json({ error: 'Collection not found' });
    if (collection.imageUrl) {
      collection.imageUrl = optimizeCloudinaryUrl(collection.imageUrl);
    }
    res.json(collection);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.createCollection = async (req, res) => {
  try {
    const collection = new Collection(req.body);
    await collection.save();
    try {
      await cache.del('storefront:collections:list');
      await cache.delPattern('storefront:collection:*').catch(() => {});
    } catch (cErr) {}
    res.status(201).json(collection);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

exports.updateCollection = async (req, res) => {
  try {
    const existing = await Collection.findById(req.params.id).lean();
    if (!existing) return res.status(404).json({ error: 'Collection not found' });

    const collection = await Collection.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });

    try {
      await cache.del('storefront:collections:list');
      await cache.del(`storefront:collection:id:${req.params.id}`);
      if (existing.urlName) await cache.del(`storefront:collection:id:${existing.urlName}`);
      if (collection.urlName) await cache.del(`storefront:collection:id:${collection.urlName}`);
      await cache.delPattern('storefront:collection:*').catch(() => {});
    } catch (cErr) {}

    res.json(collection);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

exports.deleteCollection = async (req, res) => {
  try {
    const collection = await Collection.findByIdAndDelete(req.params.id);
    if (!collection) return res.status(404).json({ error: 'Collection not found' });

    try {
      await cache.del('storefront:collections:list');
      await cache.del(`storefront:collection:id:${req.params.id}`);
      if (collection.urlName) await cache.del(`storefront:collection:id:${collection.urlName}`);
      await cache.delPattern('storefront:collection:*').catch(() => {});
    } catch (cErr) {}

    res.json({ message: 'Collection deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.deleteCollectionsBatch = async (req, res) => {
  try {
    const { collectionIds } = req.body;
    if (!Array.isArray(collectionIds)) return res.status(400).json({ error: 'collectionIds must be an array' });
    
    const collections = await Collection.find({ _id: { $in: collectionIds } }).select('urlName').lean();
    await Collection.deleteMany({ _id: { $in: collectionIds } });

    try {
      await cache.del('storefront:collections:list');
      for (const c of collections) {
        await cache.del(`storefront:collection:id:${c._id}`);
        if (c.urlName) await cache.del(`storefront:collection:id:${c.urlName}`);
      }
      await cache.delPattern('storefront:collection:*').catch(() => {});
    } catch (cErr) {}

    res.json({ message: 'Collections deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.reorderCollectionsBatch = async (req, res) => {
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
    await Collection.bulkWrite(ops);

    try {
      await cache.del('storefront:collections:list');
      await cache.delPattern('storefront:collection:*').catch(() => {});
    } catch (cErr) {}

    res.json({ message: 'Collections reordered' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to reorder collections' });
  }
};
