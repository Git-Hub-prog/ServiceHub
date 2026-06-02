const mongoose = require('mongoose');
const bcryptjs = require('bcryptjs');

const employeeSchema = new mongoose.Schema(
  {
    employeeId: {
      type: String,
      unique: true,
      required: true,
      trim: true
    },
    fullName: {
      type: String,
      required: true,
      trim: true
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true
    },
    phone: {
      type: String,
      required: true,
      trim: true
    },
    password: {
      type: String,
      required: true,
      minlength: 6
    },
    profilePhoto: {
      type: String,
      default: null
    },
    serviceCategory: {
      type: String,
      enum: ['plumber', 'electrician', 'ac-repair', 'salon', 'car-cleaner', 'tutor'],
      required: true
    },
    experience: {
      type: Number,
      default: 0 // in years
    },
    rating: {
      type: Number,
      default: 0,
      min: 0,
      max: 5
    },
    reviewCount: {
      type: Number,
      default: 0
    },
    location: {
      city: String,
      state: String,
      pincode: String
    },
    status: {
      type: String,
      enum: ['active', 'offline', 'on-leave'],
      default: 'active'
    },
    totalJobsCompleted: {
      type: Number,
      default: 0
    },
    totalRevenue: {
      type: Number,
      default: 0
    },
    joinedDate: {
      type: Date,
      default: Date.now
    },
    isVerified: {
      type: Boolean,
      default: false
    },
    documents: {
      idProof: String,
      certificatePath: String,
      backgroundCheck: String
    },
    bankDetails: {
      accountHolder: String,
      accountNumber: String,
      bankName: String,
      ifscCode: String
    },
    createdAt: {
      type: Date,
      default: Date.now
    },
    updatedAt: {
      type: Date,
      default: Date.now
    }
  },
  { timestamps: true }
);

// Hash password before saving
employeeSchema.pre('save', async function() {
  if (!this.isModified('password')) return;
  const salt = await bcryptjs.genSalt(10);
  this.password = await bcryptjs.hash(this.password, salt);
});

// Method to compare passwords
employeeSchema.methods.matchPassword = async function(password) {
  return await bcryptjs.compare(password, this.password);
};

// Method to get public profile (without sensitive data)
employeeSchema.methods.getPublicProfile = function() {
  const employeeObject = this.toObject();
  delete employeeObject.password;
  delete employeeObject.bankDetails;
  return employeeObject;
};

module.exports = mongoose.model('Employee', employeeSchema);
