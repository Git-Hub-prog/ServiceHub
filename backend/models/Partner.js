const mongoose = require('mongoose');

const normalizePhone = (value) => {
    const digits = String(value || '').replace(/\D/g, '');
    if (digits.length > 10) return digits.slice(-10);
    return digits;
};

const partnerSchema = new mongoose.Schema({
    employeeId: {
        type: String,
        trim: true,
        default: null
    },
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null
    },
    name: {
        type: String,
        required: [true, 'Please add a name']
    },
    email: {
        type: String,
        required: [true, 'Please add an email'],
        lowercase: true,
        trim: true,
        match: [
            /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
            'Please add a valid email'
        ]
    },
    phone: {
        type: String,
        required: [true, 'Please add a phone number'],
        trim: true
    },
    service: {
        type: String,
        required: [true, 'Please select a service category'],
        trim: true
    },
    approvalStatus: {
        type: String,
        enum: ['pending', 'approved', 'rejected'],
        default: 'pending'
    },
    verifiedByAdmin: {
        type: Boolean,
        default: false
    },
    isAvailable: {
        type: Boolean,
        default: true
    },
    // When assigned to a booking this holds the booking id (optional)
    currentBooking: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Booking',
        default: null
    },
    // Number of assignments done (used for simple round-robin / turn taking)
    assignmentCount: {
        type: Number,
        default: 0
    },
    // Optional geo coordinates for improved proximity matching
    coords: {
        lat: { type: Number, default: null },
        lng: { type: Number, default: null }
    },
    // Last time the partner marked as assigned (used for tie-breaks)
    lastAssignedAt: {
        type: Date,
        default: null
    },
    experience: {
        type: Number,
        required: [true, 'Please add years of experience']
    },
    ratingAvg: {
        type: Number,
        default: 0
    },
    totalJobs: {
        type: Number,
        default: 0
    },
    address: {
        type: String,
        required: [true, 'Please add an address']
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

partnerSchema.pre('validate', function () {
    if (this.email) this.email = String(this.email).trim().toLowerCase();
    if (this.phone) this.phone = normalizePhone(this.phone);
    if (this.service) this.service = String(this.service).trim();
});

// One person can be a partner only once
partnerSchema.index({ email: 1 }, { unique: true });
partnerSchema.index({ phone: 1 }, { unique: true });
partnerSchema.index({ employeeId: 1 }, { unique: true, sparse: true });

module.exports = mongoose.model('Partner', partnerSchema);
