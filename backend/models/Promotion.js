const mongoose = require('mongoose');

const promotionSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  isActive: { type: Boolean, default: true },
  startDate: { type: Date },
  endDate: { type: Date },
  
  // Conditions
  minCartSubtotal: { type: Number, default: 0, min: 0 },
  maxCartSubtotal: { type: Number, min: 0 },
  minQuantity: { type: Number, min: 0 },
  categories: [{ type: String }], // Store category _ids or urlNames
  products: [{ type: String }], // Store product ObjectIds as strings or ObjectIds
  
  // Exclusions
  excludedProducts: [{ type: String }], // Products that don't count towards minimums and don't get discounts

  // Rewards
  discountType: { type: String, enum: ['PERCENTAGE', 'FIXED', 'NONE'], default: 'NONE' },
  discountValue: { type: Number, default: 0, min: 0 },
  isFreeShipping: { type: Boolean, default: false },
  isFreeGift: { type: Boolean, default: false },
  
  // Free Gift specific settings
  giftMode: { type: String, enum: ['MANUAL', 'CHOICE'] },
  giftCollectionId: { type: mongoose.Schema.Types.ObjectId, ref: 'GiftCollection' }
  
}, { timestamps: true });

// Index for fast retrieval of active promotions
promotionSchema.index({ isActive: 1, minCartSubtotal: -1 });

module.exports = mongoose.model('Promotion', promotionSchema);
