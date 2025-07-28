const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;

// Configure multer for image uploads
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadPath = 'uploads/projects';
    try {
      await fs.mkdir(uploadPath, { recursive: true });
      cb(null, uploadPath);
    } catch (error) {
      cb(error);
    }
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'project-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Only image files are allowed'), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  }
});

// @desc   Upload project images
// @route  POST /api/upload/project-images
// @access Private/Admin
exports.uploadProjectImages = upload.array('images', 5);

exports.handleImageUpload = async (req, res, next) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No images uploaded'
      });
    }

    const imageUrls = req.files.map(file => ({
      url: `/uploads/projects/${file.filename}`,
      alt: req.body.alt || '',
      isPrimary: false
    }));

    res.status(200).json({
      success: true,
      images: imageUrls
    });
  } catch (error) {
    next(error);
  }
};
