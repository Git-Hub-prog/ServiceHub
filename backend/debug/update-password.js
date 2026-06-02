const dotenv = require('dotenv');
dotenv.config();

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const run = async () => {
  let connection;
  try {
    connection = await mongoose.connect(process.env.MONGO_URI);
    
    const email = process.argv[2];
    const newPassword = process.argv[3];
    
    if (!email || !newPassword) {
      console.error('Usage: node update-password.js <email> <newPassword>');
      console.error('Example: node update-password.js admin@servicehub.com admin@123');
      process.exit(1);
    }

    const User = require('../models/User');
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      console.error(`User with email "${email}" not found`);
      process.exit(1);
    }

    // Hash the new password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    // Update password
    await User.updateOne({ _id: user._id }, { password: hashedPassword });

    console.log(`✓ Password updated for "${user.email}"`);
    console.log(`Email: ${user.email}`);
    console.log(`Name: ${user.name}`);
    console.log(`New Password: ${newPassword}`);
    console.log(`\nYou can now login with these credentials.`);
    
    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    if (connection) await mongoose.connection.close();
    process.exit(1);
  }
};

run();
