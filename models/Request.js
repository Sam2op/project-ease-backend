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
        return this.clientType === 'user';
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
  paymentStatus: {
    type: String,
    enum: ['pending', 'partial', 'completed'],
    default: 'pending'
  },
  // Add status history for tracking changes
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

module.exports = mongoose.model('Request', requestSchema);
