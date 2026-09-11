const mongoose = require('mongoose');
const crypto = require('crypto');

const permissionsSchema = new mongoose.Schema({
  dashboard: { type: String, enum: ['full', 'read', 'none'], default: 'full' },
  orders: { type: String, enum: ['full', 'read', 'none'], default: 'none' },
  abandoned_carts: { type: String, enum: ['full', 'read', 'none'], default: 'none' },
  customers: { type: String, enum: ['full', 'read', 'none'], default: 'none' },
  products: { type: String, enum: ['full', 'read', 'none'], default: 'none' },
  collections: { type: String, enum: ['full', 'read', 'none'], default: 'none' },
  homepage: { type: String, enum: ['full', 'read', 'none'], default: 'none' },
  promotions: { type: String, enum: ['full', 'read', 'none'], default: 'none' },
  expenses: { type: String, enum: ['full', 'read', 'none'], default: 'none' },
  settings: { type: String, enum: ['full', 'read', 'none'], default: 'none' },
  shipment: { type: String, enum: ['full', 'read', 'none'], default: 'none' },
  webhooks: { type: String, enum: ['full', 'read', 'none'], default: 'none' },
  whatsapp: { type: String, enum: ['full', 'read', 'none'], default: 'none' },
  employees: { type: String, enum: ['full', 'read', 'none'], default: 'none' }
}, { _id: false });

const employeeSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'اسم الموظف مطلوب'],
    trim: true
  },
  username: {
    type: String,
    required: [true, 'اسم المستخدم مطلوب'],
    unique: true,
    lowercase: true,
    trim: true,
    minlength: [3, 'اسم المستخدم يجب أن يكون 3 أحرف على الأقل']
  },
  passwordHash: {
    type: String,
    required: true
  },
  salt: {
    type: String,
    required: true
  },
  role: {
    type: String,
    enum: ['admin', 'employee'],
    default: 'employee'
  },
  isActive: {
    type: Boolean,
    default: true
  },
  token: {
    type: String,
    default: null,
    index: true
  },
  tokenExpiresAt: {
    type: Date,
    default: null
  },
  permissions: {
    type: permissionsSchema,
    default: () => ({})
  },
  lastLogin: {
    type: Date,
    default: null
  }
}, { timestamps: true });

// Helper methods for password hashing & verification
employeeSchema.methods.setPassword = function(password) {
  this.salt = crypto.randomBytes(16).toString('hex');
  this.passwordHash = crypto.pbkdf2Sync(password, this.salt, 1000, 64, 'sha512').toString('hex');
};

employeeSchema.methods.validatePassword = function(password) {
  if (!this.salt || !this.passwordHash) return false;
  const hash = crypto.pbkdf2Sync(password, this.salt, 1000, 64, 'sha512').toString('hex');
  return this.passwordHash === hash;
};

// Generate auth token
employeeSchema.methods.generateAuthToken = function() {
  const token = 'emp_' + crypto.randomBytes(32).toString('hex');
  this.token = token;
  // Token valid for 30 days
  this.tokenExpiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  this.lastLogin = new Date();
  return token;
};

module.exports = mongoose.model('Employee', employeeSchema);
