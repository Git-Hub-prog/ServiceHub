require('dotenv').config();
const mongoose = require('mongoose');
const Employee = require('./models/Employee');
const connectDB = require('./config/db');

(async () => {
  try {
    await connectDB();
    console.log('Testing login...\n');

    // Test with EMP-002156
    const employeeId = 'EMP-002156';
    const password = 'password123';

    const employee = await Employee.findOne({ employeeId });
    console.log('Employee found:', !!employee);
    
    if (employee) {
      console.log('Employee ID:', employee.employeeId);
      console.log('Full Name:', employee.fullName);
      console.log('Email:', employee.email);
      console.log('Is Verified:', employee.isVerified);
      
      const isPasswordValid = await employee.matchPassword(password);
      console.log('\nPassword test with "password123":', isPasswordValid);
      
      console.log('\nStored hashed password:', employee.password);
    } else {
      console.log('Employee EMP-002156 not found');
      console.log('\nAvailable employees:');
      const allEmployees = await Employee.find({});
      allEmployees.forEach(emp => {
        console.log(`- ${emp.employeeId}: ${emp.fullName}`);
      });
    }

    process.exit();
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
})();
