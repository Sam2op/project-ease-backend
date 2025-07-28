const express = require('express');
const router = express.Router();
const {
  signup, login, getMe,
  forgotPassword, resetPassword,
  updatePassword, verifyEmail
} = require('../controllers/authController');
const { authMiddleware } = require('../middlewares/authMiddleware');

router.post('/signup', signup);
router.post('/login', login);
router.get('/me', authMiddleware, getMe);

router.post('/forgot-password', forgotPassword);
router.put('/reset-password/:resettoken', resetPassword);
router.put('/update-password', authMiddleware, updatePassword);
router.get('/verify-email/:token', verifyEmail);

module.exports = router;
