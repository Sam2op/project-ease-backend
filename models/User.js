const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
username: {
type: String,
required: [true, 'Username is required'],
unique: true,
trim: true,
minlength: 3,
maxlength: 30
},
email: {
type: String,
required: [true, 'Email is required'],
unique: true,
lowercase: true,
match: [/^\w+([.-]?\w+)@\w+([.-]?\w+)(.\w{2,3})+$/, 'Please enter a valid email']
},
password: {
type: String,
required: [true, 'Password is required'],
minlength: 6,
select: false
},
role: {
type: String,
enum: ['user', 'admin'],
default: 'user'
},
profilePicture: {
type: String,
default: ''
},
contactNumber: {
type: String,
required: function() {
// only required on creation
return this.isNew;
},
match: [/^[+]?[1-9][\d]{0,15}$/, 'Please enter a valid contact number']
},
githubLink: {
type: String,
default: '',
validate: {
validator: function(v) {
return !v || /^https:\/\/github\.com\/[a-zA-Z0-9_-]+\/?$/.test(v);
},
message: 'Please enter a valid GitHub URL'
}
},
userType: {
type: String,
enum: ['student', 'self-employed', 'professional'],
required: function() {
// only required on creation
return this.isNew;
}
},
college: {
type: String,
default: '',
required: function() {
// only required when userType is student
return this.userType === 'student';
}
},
isEmailVerified: {
type: Boolean,
default: false
},
emailVerificationToken: String,
passwordResetToken: String,
passwordResetExpires: Date,
createdAt: {
type: Date,
default: Date.now
}
}, {
timestamps: true
});

// Hash password before saving
userSchema.pre('save', async function(next) {
if (!this.isModified('password')) return next();
this.password = await bcrypt.hash(this.password, 12);
next();
});

// Compare password method
userSchema.methods.comparePassword = async function(candidatePassword) {
return await bcrypt.compare(candidatePassword, this.password);
};

// Generate password reset token
userSchema.methods.createPasswordResetToken = function() {
const resetToken = require('crypto').randomBytes(32).toString('hex');
this.passwordResetToken = require('crypto')
.createHash('sha256')
.update(resetToken)
.digest('hex');
this.passwordResetExpires = Date.now() + 10 * 60 * 1000; // 10 minutes
return resetToken;
};

module.exports = mongoose.model('User', userSchema);