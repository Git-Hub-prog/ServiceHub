require('dotenv').config();
const mongoose = require('mongoose');
const Employee = require('./models/Employee');

(async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB\n');
    
    const employees = await Employee.find({}).select('employeeId fullName email phone serviceCategory isVerified').limit(10);
    
    if (employees.length === 0) {
      console.log('No employees found in database');
    } else {
      console.log('Employees found:');
      employees.forEach((emp, idx) => {
        console.log(`\n${idx + 1}. Employee ID: ${emp.employeeId}`);
        console.log(`   Name: ${emp.fullName}`);
        console.log(`   Email: ${emp.email}`);
        console.log(`   Phone: ${emp.phone}`);
        console.log(`   Category: ${emp.serviceCategory}`);
        console.log(`   Verified: ${emp.isVerified}`);
      });
    }
    
    process.exit();
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
})();
