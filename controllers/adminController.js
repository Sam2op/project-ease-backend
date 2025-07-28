const User = require('../models/User');

// @desc   Get all users
// @route  GET /api/admin/users
// @access Private/Admin
exports.getUsers = async (req, res, next) => {
  try {
    const users = await User.find().select('-password');
    res.status(200).json({ success: true, count: users.length, users });
  } catch (err) {
    next(err);
  }
};

// @desc   Get single user + requests
// @route  GET /api/admin/users/:id
// @access Private/Admin
exports.getUserById = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id).select('-password');
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    res.status(200).json({ success: true, user });
  } catch (err) {
    next(err);
  }
};

// @desc   Update user (role, contact etc.)
// @route  PUT /api/admin/users/:id
// @access Private/Admin
exports.updateUser = async (req, res, next) => {
  try {
    const user = await User.findByIdAndUpdate(req.params.id, req.body, {
      new: true, runValidators: true
    }).select('-password');
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    res.status(200).json({ success: true, user });
  } catch (err) {
    next(err);
  }
};

// @desc   Delete user
// @route  DELETE /api/admin/users/:id
// @access Private/Admin
exports.deleteUser = async (req, res, next) => {
  try {
    await User.findByIdAndDelete(req.params.id);
    res.status(200).json({ success: true, message: 'User removed' });
  } catch (err) {
    next(err);
  }
};
