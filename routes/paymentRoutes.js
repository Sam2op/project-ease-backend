const express = require('express');
const router = express.Router();
const {
  createRazorpayOrder,
  verifyRazorpayPayment,
  handleRazorpayWebhook,
  getPaymentStatus
} = require('../controllers/paymentController');
const { authMiddleware } = require('../middlewares/authMiddleware');

// Create Razorpay Order
router.post('/create-order', authMiddleware, createRazorpayOrder);

// Verify Payment
router.post('/verify', authMiddleware, verifyRazorpayPayment);

// Razorpay Webhook (no auth needed - called by Razorpay)
router.post('/webhook', handleRazorpayWebhook);

// Get Payment Status
router.get('/status/:paymentId', authMiddleware, getPaymentStatus);

module.exports = router;
