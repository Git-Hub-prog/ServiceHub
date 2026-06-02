const dotenv = require('dotenv');
const connectDB = require('../config/db');
const Booking = require('../models/Booking');
const bookingController = require('../controllers/bookingController');

dotenv.config();

const run = async () => {
  try {
    await connectDB();
    const arg = process.argv[2];
    let booking;
    if (arg) {
      booking = await Booking.findById(arg);
      if (!booking) {
        console.error('Booking not found:', arg);
        process.exit(1);
      }
    } else {
      booking = await Booking.findOne({ assignmentStatus: 'searching' });
      if (!booking) {
        console.error('No searching bookings found');
        process.exit(1);
      }
    }

    console.log('Testing assignment for booking:', String(booking._id), booking.serviceName, booking.address);
    const result = await bookingController.assignWorkerForBooking(booking);
    console.log('assignWorkerForBooking returned:', result);
    if (result) {
      await booking.save();
      console.log('Booking updated with agent:', booking.agent);
    } else {
      console.log('No assignment made. Check server logs for candidate details.');
    }
    process.exit(0);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
};

run();
