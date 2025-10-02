const express = require('express');
const router = express.Router();
const {
  createRequest,
  getAllRequests,
  updateRequest,
  getUserRequests,
  updatePaymentOption,
  getRequestById
} = require('../controllers/requestController');
const {
  optionalAuthMiddleware,
  authMiddleware,
  adminMiddleware
} = require('../middlewares/authMiddleware');

// Submit request (guest or logged-in)
router.post('/', optionalAuthMiddleware, createRequest);

// Get user's own requests
router.get('/my', authMiddleware, getUserRequests);

// Get specific request by ID
router.get('/:id', authMiddleware, getRequestById);

// Admin list & update
router.get('/', authMiddleware, adminMiddleware, getAllRequests);
router.put('/:id', authMiddleware, adminMiddleware, updateRequest);

// Update payment option for a request
router.put('/:id/payment-option', authMiddleware, updatePaymentOption);

module.exports = router;
