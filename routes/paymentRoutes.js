const express = require('express');
const router = express.Router();
const {
  createOrder, verifyPayment
} = require('../controllers/paymentController');
const { authMiddleware } = require('../middlewares/authMiddleware');

router.post('/create-order', authMiddleware, createOrder);
router.post('/verify', authMiddleware, verifyPayment);

module.exports = router;
