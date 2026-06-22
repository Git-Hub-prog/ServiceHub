const dotenv = require('dotenv');
dotenv.config();

const mongoose = require('mongoose');

const run = async () => {
  let connection;
  try {
    connection = await mongoose.connect(process.env.MONGO_URI);
    
    const email = process.argv[2];
    if (!email) {
      console.error('Usage: node set-admin.js <email>');
      console.error('Example: node set-admin.js admin@servicehub.com');
      process.exit(1);
    }

    const User = require('../models/User');
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      console.error(`User with email "${email}" not found`);
      process.exit(1);
    }

    // Update role directly without triggering save middleware issues
    await User.updateOne({ _id: user._id }, { role: 'admin' });

    const updatedUser = await User.findById(user._id);
    console.log(`✓ User "${updatedUser.email}" role updated to "admin"`);
    console.log(`Name: ${updatedUser.name}`);
    console.log(`Email: ${updatedUser.email}`);
    console.log(`Role: ${updatedUser.role}`);
    
    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    if (connection) await mongoose.connection.close();
    process.exit(1);
  }
};

run();
