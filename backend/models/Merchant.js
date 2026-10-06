const mongoose = require('mongoose');

const merchantSchema = new mongoose.Schema({
  businessName: { type: String, required: true },
  brandName:    { type: String, required: true },
  category:     { type: String, required: true },
  email:        { type: String, required: true, unique: true },
  phone:        { type: String, required: true },
  username:     { type: String, required: true, unique: true },
  password:     { type: String, required: true },
  role:         { type: String, default: 'merchant' },
  storeSlug:    { type: String, required: true, unique: true }
}, { timestamps: true });

module.exports = mongoose.model('Merchant', merchantSchema);
