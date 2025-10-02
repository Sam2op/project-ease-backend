const mongoose = require('mongoose');

const requestSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['existing', 'custom'],
    required: [true, 'Request type is required']
  },
  
  project: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project',
    required: function() {
      return this.type === 'existing';
    }
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: function() {
      return this.clientType === 'registered';
    }
  },
  clientType: {
    type: String,
    enum: ['registered', 'guest'],
    required: true
  },
  
  // Guest client info
  guestInfo: {
    name: {
      type: String,
      required: function() {
        return this.clientType === 'guest';
      }
    },
    email: {
      type: String,
      required: function() {
        return this.clientType === 'guest';
      }
    },
    contact: {
      type: String,
      required: function() {
        return this.clientType === 'guest';
      }
    }
  },
  
  // Custom project details
  customProject: {
    name: {
      type: String,
      required: function() {
        return this.type === 'custom';
      }
    },
    description: {
      type: String,
      required: function() {
        return this.type === 'custom';
      }
    },
    technologies: [{
      type: String
    }],
    additionalRequirements: {
      type: String,
      default: ''
    }
  },
  
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'in-progress', 'completed'],
    default: 'pending'
  },
  
  adminNotes: {
    type: String,
    default: ''
  },
  
  currentModule: {
    type: String,
    default: ''
  },
  
  expectedCompletion: {
    type: Date
  },
  
  estimatedPrice: {
    type: Number,
    default: 0
  },
  
  actualPrice: {
    type: Number,
    default: 0
  },
  
  githubLink: {
    type: String,
    default: ''
  },
  
  // Payment Integration Fields
  paymentStatus: {
    type: String,
    enum: ['pending', 'partial', 'completed'],
    default: 'pending'
  },
  
  paymentOption: {
    type: String,
    enum: ['advance', 'full'],
    default: 'advance'
  },
  
  totalAmount: {
    type: Number,
    default: function() {
      return this.actualPrice || this.estimatedPrice || 0;
    }
  },
  
  advanceAmount: {
    type: Number,
    default: function() {
      return Math.round((this.actualPrice || this.estimatedPrice || 0) * 0.7);
    }
  },
  
  remainingAmount: {
    type: Number,
    default: function() {
      const total = this.actualPrice || this.estimatedPrice || 0;
      const advance = Math.round(total * 0.7);
      return total - advance;
    }
  },
  
  // Payment Records
  payments: [{
    paymentId: {
      type: String,
      required: true,
      unique: true
    },
    orderId: String, // Razorpay/Payment Gateway Order ID
    amount: {
      type: Number,
      required: true
    },
    type: {
      type: String,
      enum: ['advance', 'remaining', 'full'],
      required: true
    },
    status: {
      type: String,
      enum: ['pending', 'completed', 'failed', 'expired'],
      default: 'pending'
    },
    method: {
      type: String,
      enum: ['upi', 'card', 'netbanking', 'wallet'],
      default: 'upi'
    },
    qrCodeData: String,
    upiLink: String,
    qrExpiresAt: Date,
    transactionId: String,
    razorpayPaymentId: String,
    razorpayOrderId: String,
    razorpaySignature: String,
    paidAt: Date,
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  
  // Status history for tracking changes
  statusHistory: [{
    status: String,
    notes: String,
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    updatedAt: {
      type: Date,
      default: Date.now
    }
  }],
  
  approvedAt: Date,
  completedAt: Date
}, {
  timestamps: true
});

// Update totalAmount when actualPrice or estimatedPrice changes
requestSchema.pre('save', function(next) {
  if (this.isModified('actualPrice') || this.isModified('estimatedPrice')) {
    const total = this.actualPrice || this.estimatedPrice || 0;
    this.totalAmount = total;
    this.advanceAmount = Math.round(total * 0.7);
    this.remainingAmount = total - this.advanceAmount;
  }
  next();
});

module.exports = mongoose.model('Request', requestSchema);
