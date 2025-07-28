const mongoose = require('mongoose');

const projectSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Project name is required'],
    trim: true,
    maxlength: 100
  },
  description: {
    type: String,
    required: [true, 'Project description is required'],
    maxlength: 500
  },
  detailedDescription: {
    type: String,
    required: [true, 'Detailed description is required'],
    maxlength: 2000
  },
  technologies: {
    frontend: [{
      type: String,
      required: true
    }],
    backend: [{
      type: String,
      required: true
    }],
    database: [{
      type: String
    }],
    other: [{
      type: String
    }]
  },
  category: {
    type: String,
    required: [true, 'Category is required'],
    enum: ['web', 'mobile', 'desktop', 'ai-ml', 'other']
  },
  duration: {
    type: String,
    required: [true, 'Duration is required']
  },
  price: {
    type: Number,
    required: [true, 'Price is required'],
    min: 0
  },
  features: [{
    type: String
  }],
  workflow: [{
    step: {
      type: String,
      required: true
    },
    description: {
      type: String,
      required: true
    }
  }],
  images: [{
    url: {
      type: String,
      required: true
    },
    alt: {
      type: String,
      default: ''
    },
    isPrimary: {
      type: Boolean,
      default: false
    }
  }],
  demoUrl: {
    type: String,
    default: ''
  },
  githubUrl: {
    type: String,
    default: ''
  },
  isActive: {
    type: Boolean,
    default: true
  },
  // Additional fields for enhanced functionality
  difficulty: {
    type: String,
    enum: ['beginner', 'intermediate', 'advanced'],
    default: 'intermediate'
  },
  estimatedHours: {
    type: Number,
    min: 0
  },
  tags: [{
    type: String,
    trim: true
  }],
  // Payment configuration
  allowAdvancePayment: {
    type: Boolean,
    default: true
  },
  advancePercentage: {
    type: Number,
    default: 70,
    min: 0,
    max: 100
  },
  // Custom project related
  isCustomProject: {
    type: Boolean,
    default: false
  },
  originalRequest: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Request'
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true
});

// Index for better search performance
projectSchema.index({ name: 'text', description: 'text', tags: 'text' });
projectSchema.index({ category: 1, isActive: 1 });
projectSchema.index({ price: 1 });

// Virtual for calculated advance amount
projectSchema.virtual('advanceAmount').get(function() {
  return Math.round(this.price * (this.advancePercentage / 100));
});

// Virtual for remaining amount
projectSchema.virtual('remainingAmount').get(function() {
  return this.price - this.advanceAmount;
});

// Ensure virtuals are included in JSON output
projectSchema.set('toJSON', { virtuals: true });

module.exports = mongoose.model('Project', projectSchema);
