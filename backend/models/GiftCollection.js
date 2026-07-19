const mongoose = require('mongoose');

const giftCollectionSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  products: [{ type: String }], // Store product IDs (strings or ObjectIds)
}, { timestamps: true });

module.exports = mongoose.model('GiftCollection', giftCollectionSchema);
