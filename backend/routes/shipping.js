const express = require('express');
const router = express.Router();
const shippingFees = require('../config/shipping');

// GET /api/shipping — return governorate → fee map
router.get('/', (req, res) => {
  res.json(shippingFees);
});

module.exports = router;
