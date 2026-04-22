const mongoose = require('mongoose');

const webhookSchema = new mongoose.Schema({
  url: { type: String, required: true },
  description: { type: String, default: '' },
  active: { type: Boolean, default: true }
}, { timestamps: true });

module.exports = mongoose.model('Webhook', webhookSchema);
