const express = require('express');
const router = express.Router();
const {
  getUsers, getUserById, updateUser, deleteUser
} = require('../controllers/adminController');
const { authMiddleware, adminMiddleware } = require('../middlewares/authMiddleware');

router.use(authMiddleware, adminMiddleware);

router.route('/users')
  .get(getUsers);

router.route('/users/:id')
  .get(getUserById)
  .put(updateUser)
  .delete(deleteUser);

module.exports = router;
