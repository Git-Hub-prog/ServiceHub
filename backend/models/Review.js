const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema({
  reviewerName: { type: String, required: true, trim: true },
  reviewerRole: { type: String, enum: ['user'], default: 'user' },
  serviceName: { type: String, required: true, trim: true },
  rating: { type: Number, required: true, min: 1, max: 5 },
  punctuality: { type: Number, min: 1, max: 5, default: 5 },
  professionalism: { type: Number, min: 1, max: 5, default: 5 },
  valueForMoney: { type: Number, min: 1, max: 5, default: 5 },
  recommend: { type: Boolean, default: true },
  urgency: { type: String, enum: ['low', 'medium', 'high'], default: 'medium' },
  title: { type: String, trim: true, default: '' },
  comment: { type: String, required: true, trim: true },
  createdAt: { type: Date, default: Date.now }
});

reviewSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Review', reviewSchema);