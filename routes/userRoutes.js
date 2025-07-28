const express = require('express');
const router = express.Router();
const { getProfile, updateProfile, deleteAccount } = require('../controllers/userController');
const { authMiddleware } = require('../middlewares/authMiddleware');

router.get('/me', authMiddleware, getProfile);
router.put('/me', authMiddleware, updateProfile);
router.delete('/me', authMiddleware, deleteAccount);

module.exports = router;
