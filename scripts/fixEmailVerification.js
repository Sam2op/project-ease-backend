const mongoose = require('mongoose');
require('dotenv').config();

mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const User = require('../models/User');

async function fixExistingUsers() {
  try {
    console.log('Fixing existing users...');
    
    // Update all users who don't have isEmailVerified field or have it set to false
    const result = await User.updateMany(
      {
        $or: [
          { isEmailVerified: { $exists: false } },
          { isEmailVerified: null },
          { isEmailVerified: false, createdAt: { $lt: new Date('2024-01-01') } }
        ]
      },
      { $set: { isEmailVerified: true } }
    );
    
    console.log(`Updated ${result.modifiedCount} users`);
    console.log('All existing users can now log in!');
    
    process.exit(0);
  } catch (error) {
    console.error('Error fixing users:', error);
    process.exit(1);
  }
}

fixExistingUsers();
