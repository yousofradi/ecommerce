const express = require('express');
const router = express.Router();
const collectionController = require('../controllers/collectionController');
const adminAuth = require('../middleware/adminAuth');

router.get('/', collectionController.getCollections);
router.get('/:id', collectionController.getCollection);

// Admin only routes
router.post('/', adminAuth, collectionController.createCollection);
router.put('/:id', adminAuth, collectionController.updateCollection);
router.delete('/:id', adminAuth, collectionController.deleteCollection);

module.exports = router;
