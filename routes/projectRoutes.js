const express = require('express');
const router = express.Router();
const {
  getProjects,
  getProjectById,
  createProject,
  updateProject,
  deleteProject
} = require('../controllers/projectController');
const { authMiddleware, adminMiddleware } = require('../middlewares/authMiddleware');

// Public routes
router.get('/', getProjects);
router.get('/:id', getProjectById);

// Admin routes
router.post('/', authMiddleware, adminMiddleware, createProject);
router.put('/:id', authMiddleware, adminMiddleware, updateProject);
router.delete('/:id', authMiddleware, adminMiddleware, deleteProject);

module.exports = router;
