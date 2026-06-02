const mongoose = require('mongoose');

const serviceDetailSchema = new mongoose.Schema({
  title: { type: String, required: true },
  image: { type: String, required: true },
  description: { type: String, required: true },
  price: { type: Number, required: true },
  priceText: { type: String }
});

const serviceCategorySchema = new mongoose.Schema({
  categoryId: { type: String, required: true, unique: true },
  categoryTitle: { type: String, required: true },
  services: [serviceDetailSchema]
}, { timestamps: true });

module.exports = mongoose.model('Service', serviceCategorySchema);
