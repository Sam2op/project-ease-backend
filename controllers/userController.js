const User    = require('../models/User');
const Project = require('../models/Project');
const Request = require('../models/Request');

// @desc   Get profile (self)
// @route  GET /api/users/me
// @access Private
exports.getProfile = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    res.status(200).json({ success: true, user });
  } catch (err) {
    next(err);
  }
};

// @desc   Update profile (self) - FIXED
// @route  PUT /api/users/me
// @access Private
exports.updateProfile = async (req, res, next) => {
  try {
    // Fields that can be updated by user
    const allowedUpdates = [
      'username', 'contactNumber', 'githubLink', 'profilePicture'
    ];
    
    const updates = {};
    allowedUpdates.forEach(field => {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    });

    // Check if username is already taken (if username is being updated)
    if (updates.username) {
      const existingUser = await User.findOne({ 
        username: updates.username, 
        _id: { $ne: req.user._id } 
      });
      
      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: 'Username is already taken'
        });
      }
    }

    const user = await User.findByIdAndUpdate(
      req.user._id, 
      updates, 
      {
        new: true,
        runValidators: true
      }
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.status(200).json({ success: true, user });
  } catch (err) {
    if (err.name === 'ValidationError') {
      const message = Object.values(err.errors).map(val => val.message).join(', ');
      return res.status(400).json({ success: false, message });
    }
    next(err);
  }
};

// @desc   Delete user account (self)
// @route  DELETE /api/users/me
// @access Private
exports.deleteAccount = async (req, res, next) => {
  try {
    const userId = req.user.id;

    // Delete all related data
    await Project.deleteMany({ createdBy: userId });
    await Request.deleteMany({ user: userId });

    // Finally delete the user document
    await User.findByIdAndDelete(userId);

    res.status(200).json({ success: true, message: 'Account and all related data deleted.' });
  } catch (err) {
    next(err);
  }
};
