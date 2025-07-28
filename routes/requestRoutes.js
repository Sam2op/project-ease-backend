const express = require('express');
const router = express.Router();
const {
  createRequest,
  getAllRequests,
  updateRequest,
  getUserRequests,
  updatePaymentOption
} = require('../controllers/requestController');
const {
  optionalAuthMiddleware,
  authMiddleware,
  adminMiddleware
} = require('../middlewares/authMiddleware');

// submit request (guest or logged-in)
router.post('/', optionalAuthMiddleware, createRequest);

// user’s own requests
router.get('/my', authMiddleware, getUserRequests);

// admin list & update
router.get('/', authMiddleware, adminMiddleware, getAllRequests);
router.put('/:id', authMiddleware, adminMiddleware, updateRequest);

router.put('/:id/payment-option', authMiddleware, updatePaymentOption);


module.exports = router;
