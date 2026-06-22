require('dotenv').config();
const mongoose = require('mongoose');
const Employee = require('./models/Employee');
const Partner = require('./models/Partner');
const connectDB = require('./config/db');

(async () => {
  try {
    await connectDB();
    console.log('Connected to MongoDB\n');

    // Create sample employees
    const sampleEmployees = [
      {
        employeeId: 'EMP-001245',
        fullName: 'Amit Sharma',
        email: 'amit@email.com',
        phone: '+91 98765 43210',
        password: 'password123',
        serviceCategory: 'plumber',
        experience: 5,
        rating: 4.8,
        reviewCount: 42,
        isVerified: true,
        status: 'active'
      },
      {
        employeeId: 'EMP-002156',
        fullName: 'Priya Patel',
        email: 'priya@email.com',
        phone: '+91 87654 32109',
        password: 'password123',
        serviceCategory: 'electrician',
        experience: 3,
        rating: 4.6,
        reviewCount: 28,
        isVerified: true,
        status: 'active'
      },
      {
        employeeId: 'EMP-003567',
        fullName: 'Rajesh Kumar',
        email: 'rajesh@email.com',
        phone: '+91 76543 21098',
        password: 'password123',
        serviceCategory: 'ac-repair',
        experience: 7,
        rating: 4.9,
        reviewCount: 56,
        isVerified: true,
        status: 'active'
      }
    ];

    // Clear existing data
    await Employee.deleteMany({});
    await Partner.deleteMany({});
    console.log('Cleared existing employee and partner data\n');

    // Create employees
    const createdEmployees = [];
    for (const empData of sampleEmployees) {
      const emp = new Employee(empData);
      await emp.save(); // This triggers the pre-save hook for password hashing
      createdEmployees.push(emp);
    }
    console.log('✅ Sample employees created:\n');

    createdEmployees.forEach((emp, idx) => {
      console.log(`${idx + 1}. Employee ID: ${emp.employeeId}`);
      console.log(`   Name: ${emp.fullName}`);
      console.log(`   Email: ${emp.email}`);
      console.log(`   Service: ${emp.serviceCategory}`);
      console.log(`   Password: password123\n`);
    });

    // Also create corresponding partners so employees can login
    const partners = createdEmployees.map(emp => ({
      employeeId: emp.employeeId,
      email: emp.email,
      name: emp.fullName,
      phone: emp.phone,
      service: emp.serviceCategory,
      address: 'Delhi, India',
      experience: emp.experience,
      approvalStatus: 'approved',
      verifiedByAdmin: true
    }));

    await Partner.insertMany(partners);
    console.log('✅ Partner records created for all employees\n');

    console.log('🔑 Login Credentials:');
    console.log('========================');
    console.log('Employee 1: EMP-001245 / password123 (Plumber)');
    console.log('Employee 2: EMP-002156 / password123 (Electrician)');
    console.log('Employee 3: EMP-003567 / password123 (AC Repair)');

    process.exit();
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
})();
