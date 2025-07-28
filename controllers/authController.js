// controllers/authController.js
const User = require('../models/User');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { sendEmail } = require('../utils/sendEmail');

/* ───────────────────────────────────────────
   Helpers
─────────────────────────────────────────── */

// Generate JWT
const generateToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE,
  });

// Send token + user payload
const sendTokenResponse = (user, statusCode, res) => {
  const token = generateToken(user._id);

  res.status(statusCode).json({
    success: true,
    token,
    user: {
      id: user._id,
      username: user.username,
      email: user.email,
      role: user.role,
      profilePicture: user.profilePicture,
      contactNumber: user.contactNumber,
      githubLink: user.githubLink,
      isEmailVerified: user.isEmailVerified,
    },
  });
};

/* ───────────────────────────────────────────
   Auth: Sign-up (email verification)
─────────────────────────────────────────── */
exports.signup = async (req, res, next) => {
  try {
    const { username, email, password, userType, contactNumber, college, githubLink } = req.body;


    // Prevent duplicates
    const existingUser = await User.findOne({
      $or: [{ email }, { username }],
    });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User already exists with this email or username',
      });
    }

    if (!userType) {
  return res.status(400).json({ success: false, message: 'User type is required' });
}
if (!contactNumber) {
  return res.status(400).json({ success: false, message: 'Contact number is required' });
}


    // Create unverified user
const user = await User.create({
  username,
  email,
  password,
  userType,
  contactNumber,
  college: userType === 'student' ? college : '',
  githubLink: githubLink || '',
  isEmailVerified: false
});


    // Generate email-verification token
    const verificationToken = crypto.randomBytes(20).toString('hex');
    user.emailVerificationToken = crypto
      .createHash('sha256')
      .update(verificationToken)
      .digest('hex');
    await user.save({ validateBeforeSave: false });

    // Send verification email
    const verificationUrl = `${process.env.FRONTEND_URL}/verify-email/${verificationToken}`;
    const message = `
Welcome to ProjectEase!

Click the link below to verify your email and activate your account:
${verificationUrl}

The link expires in 24 h. If you did not sign up, ignore this email.

— ProjectEase Team
`.trim();

    await sendEmail({
      email: user.email,
      subject: 'Verify your email – ProjectEase',
      message,
    });

    res.status(201).json({
      success: true,
      message:
        'Account created! Please verify your email before logging in.',
    });
  } catch (err) {
    next(err);
  }
};

/* ───────────────────────────────────────────
   Auth: Login
─────────────────────────────────────────── */
exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password)
      return res.status(400).json({
        success: false,
        message: 'Please provide an email and password',
      });

    const user = await User.findOne({ email }).select('+password');
    if (!user)
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials',
      });

    // Check password first
    const isMatch = await user.comparePassword(password);
    if (!isMatch)
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials',
      });

    // Fix for existing users: If isEmailVerified is undefined OR false for existing users, set to true
    if (user.isEmailVerified === undefined || user.isEmailVerified === null) {
      user.isEmailVerified = true;
      await user.save({ validateBeforeSave: false });
    }

    // ONLY block login if user was created AFTER email verification was implemented
    // explicitly has isEmailVerified set to false (new unverified users)
    if (user.isEmailVerified === false && user.createdAt > new Date('2025-07-26')) {
      return res.status(401).json({
        success: false,
        message: 'Please verify your email before logging in. Check your inbox.',
      });
    }

    sendTokenResponse(user, 200, res);
  } catch (err) {
    console.error('Login error:', err);
    next(err);
  }
};


/* ───────────────────────────────────────────
   Auth: Get current user
─────────────────────────────────────────── */
exports.getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    res.status(200).json({ success: true, user });
  } catch (err) {
    next(err);
  }
};

/* ───────────────────────────────────────────
   Auth: Update password
─────────────────────────────────────────── */
exports.updatePassword = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id).select('+password');

    if (!(await user.comparePassword(req.body.currentPassword)))
      return res.status(400).json({
        success: false,
        message: 'Current password is incorrect',
      });

    user.password = req.body.newPassword;
    await user.save();

    // Confirmation email
    const resetToken = user.createPasswordResetToken();
    await user.save({ validateBeforeSave: false });
    const resetUrl = `${process.env.FRONTEND_URL}/reset-password/${resetToken}`;

    const message = `
Hi ${user.username},

Your password was just changed. If this wasn’t you, reset it immediately:
${resetUrl}

Link valid for 10 min.

— ProjectEase Security
`.trim();

    await sendEmail({
      email: user.email,
      subject: 'Your password was updated',
      message,
    });

    res
      .status(200)
      .json({ success: true, message: 'Password updated successfully' });
  } catch (err) {
    next(err);
  }
};

/* ───────────────────────────────────────────
   Auth: Forgot password – send email
─────────────────────────────────────────── */
exports.forgotPassword = async (req, res, next) => {
  try {
    const user = await User.findOne({ email: req.body.email });
    if (!user)
      return res
        .status(404)
        .json({ success: false, message: 'No user with that email' });

    const resetToken = user.createPasswordResetToken();
    await user.save({ validateBeforeSave: false });

    const resetUrl = `${process.env.FRONTEND_URL}/reset-password/${resetToken}`;
    const message = `
You requested a password reset.

Reset it here (valid 10 min): ${resetUrl}

If you didn’t request this, please ignore the email.
`.trim();

    await sendEmail({
      email: user.email,
      subject: 'Reset your password – ProjectEase',
      message,
    });

    res.json({ success: true, message: 'Reset link sent' });
  } catch (err) {
    next(err);
  }
};

/* ───────────────────────────────────────────
   Auth: Reset password
─────────────────────────────────────────── */
exports.resetPassword = async (req, res, next) => {
  try {
    const hashed = crypto
      .createHash('sha256')
      .update(req.params.resettoken)
      .digest('hex');

    const user = await User.findOne({
      passwordResetToken: hashed,
      passwordResetExpires: { $gt: Date.now() },
    });
    if (!user)
      return res
        .status(400)
        .json({ success: false, message: 'Token invalid or expired' });

    user.password = req.body.password;
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save();

    sendTokenResponse(user, 200, res);
  } catch (err) {
    next(err);
  }
};

/* ───────────────────────────────────────────
   Auth: Verify email
─────────────────────────────────────────── */
exports.verifyEmail = async (req, res, next) => {
  try {
    const hashed = crypto
      .createHash('sha256')
      .update(req.params.token)
      .digest('hex');

    const user = await User.findOne({ emailVerificationToken: hashed });
    if (!user)
      return res
        .status(400)
        .json({ success: false, message: 'Verification token invalid' });

    user.isEmailVerified = true;
    user.emailVerificationToken = undefined;
    await user.save();

    sendTokenResponse(user, 200, res);
  } catch (err) {
    next(err);
  }
};
