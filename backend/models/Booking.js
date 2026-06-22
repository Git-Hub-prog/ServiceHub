const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  serviceName: { type: String, required: true },
  price: { type: Number, required: true },
  customerName: { type: String, required: true },
  customerPhone: { type: String, required: true },
  address: { type: String, required: true },
  bookingDate: { type: Date, required: true },
  coords: {
    lat: { type: Number, default: null },
    lng: { type: Number, default: null }
  },
  // when a partner was assigned to this booking
  assignmentAt: { type: Date, default: null },
  status: { type: String, enum: ['pending', 'completed', 'cancelled'], default: 'pending' },
  paymentStatus: { type: String, enum: ['pending', 'paid', 'failed'], default: 'pending' },
  assignmentStatus: { type: String, enum: ['searching', 'assigned'], default: 'searching' },
  estimatedArrivalTime: { type: Date, default: null },
  progress: {
    type: String,
    enum: ['searching', 'on_the_way', 'arrived', 'service_started', 'completed'],
    default: 'searching'
  },
  agent: {
    partnerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Partner', default: null },
    fullName: { type: String, default: '' },
    contactNumber: { type: String, default: '' },
    serviceType: { type: String, default: '' }
  },
  shift: { type: String, default: null },
  startTime: { type: String, default: null },
  paymentOverrideReason: { type: String, default: null },
  paymentOverrideBy: { type: String, default: null },
  completedBy: {
    employeeName: { type: String, default: null },
    employeeUserId: { type: String, default: null },
    completedAt: { type: Date, default: null }
  }
}, { timestamps: true });

module.exports = mongoose.model('Booking', bookingSchema);
