const express = require('express');
const router = express.Router();
const { uploadProjectImages, handleImageUpload } = require('../controllers/uploadController');
const { authMiddleware, adminMiddleware } = require('../middlewares/authMiddleware');

router.post('/project-images', authMiddleware, adminMiddleware, uploadProjectImages, handleImageUpload);

module.exports = router;
