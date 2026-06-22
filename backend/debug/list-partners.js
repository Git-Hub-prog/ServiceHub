const dotenv = require('dotenv');
const connectDB = require('../config/db');
const Partner = require('../models/Partner');

dotenv.config();

const run = async () => {
  try {
    await connectDB();
    const target = process.argv[2] || 'plumber';
    const regex = new RegExp(`^${target}$`, 'i');
    const partners = await Partner.find({ service: { $regex: regex } }).lean();
    console.log('Found partners:', partners.length);
    for (const p of partners) {
      console.log('---');
      console.log('id:', p._id);
      console.log('name:', p.name);
      console.log('service:', p.service);
      console.log('address:', p.address);
      console.log('coords:', p.coords || null);
      console.log('isAvailable:', p.isAvailable);
      console.log('assignmentCount:', p.assignmentCount || 0);
    }
    process.exit(0);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
};

run();
