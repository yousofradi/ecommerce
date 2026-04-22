const express = require('express');
const router = express.Router();
const webhookController = require('../controllers/webhookController');
const { requireAdmin } = require('../middleware/auth');

// All webhook routes are admin-only
router.get('/', requireAdmin, webhookController.getWebhooks);
router.post('/', requireAdmin, webhookController.createWebhook);
router.put('/:id', requireAdmin, webhookController.updateWebhook);
router.delete('/:id', requireAdmin, webhookController.deleteWebhook);

module.exports = router;
