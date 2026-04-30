const mongoose = require('mongoose');

const optionValueSchema = new mongoose.Schema({
  label: { type: String, required: true },
  price: { type: Number, required: true, default: 0 }
}, { _id: false });

const optionGroupSchema = new mongoose.Schema({
  name: { type: String, required: true },
  required: { type: Boolean, default: false },
  values: { type: [optionValueSchema], required: true, validate: v => v.length > 0 }
}, { _id: false });

const productSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  handle: { type: String, default: '' },
  basePrice: { type: Number, required: true, min: 0 },
  salePrice: { type: Number, default: null },
  imageUrl: { type: String, default: '' },
  images: { type: [String], default: [] },
  description: { type: String, default: '' },
  collectionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Collection', default: null },
  collectionIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Collection' }],
  options: { type: [optionGroupSchema], default: [] },
  sortOrder: { type: Number, default: 0 },
  active: { type: Boolean, default: true },
  status: { type: String, enum: ['active', 'draft'], default: 'active' },
  quantity: { type: Number, default: null }
}, { timestamps: true });

module.exports = mongoose.model('Product', productSchema);
