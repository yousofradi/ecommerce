const express = require('express');
const router = express.Router();
const collectionController = require('../controllers/collectionController');
const { requireAdmin } = require('../middleware/auth');

router.get('/', collectionController.getCollections);
router.get('/:id', collectionController.getCollection);

// Admin only routes
router.post('/', requireAdmin, collectionController.createCollection);
router.put('/:id', requireAdmin, collectionController.updateCollection);
router.delete('/:id', requireAdmin, collectionController.deleteCollection);

module.exports = router;
