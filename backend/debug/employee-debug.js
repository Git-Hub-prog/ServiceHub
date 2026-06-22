#!/usr/bin/env node

/**
 * Employee System Debug Script
 * Use this to create sample employee data and test API endpoints
 */

const mongoose = require('mongoose');
require('dotenv').config();

const Employee = require('../models/Employee');
const connectDB = require('../config/db');

async function createSampleEmployee() {
  try {
    await connectDB();
    console.log('✅ Connected to MongoDB');

    // Check if employee exists
    const existing = await Employee.findOne({ employeeId: 'EMP-001245' });
    if (existing) {
      console.log('⚠️  Employee EMP-001245 already exists');
      return;
    }

    // Create sample employee
    const employee = new Employee({
      employeeId: 'EMP-001245',
      fullName: 'Amit Sharma',
      email: 'amit@email.com',
      phone: '+91 98765 43210',
      password: 'password123', // Will be hashed automatically
      serviceCategory: 'plumber',
      experience: 5,
      rating: 4.8,
      reviewCount: 42,
      profilePhoto: 'https://via.placeholder.com/150',
      location: {
        city: 'Delhi',
        state: 'Delhi',
        pincode: '110001'
      },
      status: 'active',
      totalJobsCompleted: 28,
      totalRevenue: 32800,
      joinedDate: new Date('2019-01-15'),
      isVerified: true,
      bankDetails: {
        accountHolder: 'Amit Sharma',
        accountNumber: '1234567890',
        bankName: 'HDFC Bank',
        ifscCode: 'HDFC0001234'
      }
    });

    await employee.save();
    console.log('✅ Sample employee created successfully');
    console.log('📝 Employee ID: EMP-001245');
    console.log('🔑 Password: password123');

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    process.exit();
  }
}

async function testLogin() {
  try {
    await connectDB();
    console.log('✅ Connected to MongoDB');

    const employee = await Employee.findOne({ employeeId: 'EMP-001245' });

    if (!employee) {
      console.log('❌ Employee not found');
      return;
    }

    // Test password matching
    const isMatch = await employee.matchPassword('password123');
    console.log(isMatch ? '✅ Password matches' : '❌ Password does not match');

    // Test public profile
    const publicProfile = employee.getPublicProfile();
    console.log('✅ Public profile retrieved');
    console.log('   - Password in profile:', publicProfile.password ? '❌ VISIBLE' : '✅ HIDDEN');
    console.log('   - Bank details in profile:', publicProfile.bankDetails ? '❌ VISIBLE' : '✅ HIDDEN');

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    process.exit();
  }
}

async function listAllEmployees() {
  try {
    await connectDB();
    console.log('✅ Connected to MongoDB');

    const employees = await Employee.find({}).select('-password');
    console.log(`📋 Found ${employees.length} employees:`);
    console.log('');

    employees.forEach((emp, index) => {
      console.log(`${index + 1}. ${emp.fullName}`);
      console.log(`   ID: ${emp.employeeId}`);
      console.log(`   Service: ${emp.serviceCategory}`);
      console.log(`   Status: ${emp.status}`);
      console.log(`   Rating: ${emp.rating}⭐`);
      console.log(`   Jobs: ${emp.totalJobsCompleted}`);
      console.log(`   Revenue: ₹${emp.totalRevenue}`);
      console.log('');
    });

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    process.exit();
  }
}

async function deleteEmployee(employeeId) {
  try {
    await connectDB();
    console.log('✅ Connected to MongoDB');

    const result = await Employee.findOneAndDelete({ employeeId });

    if (result) {
      console.log(`✅ Employee ${employeeId} deleted successfully`);
    } else {
      console.log(`❌ Employee ${employeeId} not found`);
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    process.exit();
  }
}

// CLI argument handler
const command = process.argv[2];
const arg = process.argv[3];

console.log('🔧 Employee System Debug Script\n');

switch (command) {
  case 'create':
    console.log('📝 Creating sample employee...\n');
    createSampleEmployee();
    break;

  case 'test-login':
    console.log('🔐 Testing login functionality...\n');
    testLogin();
    break;

  case 'list':
    console.log('📋 Listing all employees...\n');
    listAllEmployees();
    break;

  case 'delete':
    if (!arg) {
      console.log('❌ Please provide employee ID');
      console.log('Usage: node debug-employee.js delete EMP-001245');
      process.exit();
    }
    console.log(`🗑️  Deleting employee ${arg}...\n`);
    deleteEmployee(arg);
    break;

  default:
    console.log('📖 Usage:');
    console.log('  node debug-employee.js create        - Create sample employee');
    console.log('  node debug-employee.js test-login    - Test login functionality');
    console.log('  node debug-employee.js list          - List all employees');
    console.log('  node debug-employee.js delete [ID]   - Delete employee by ID');
    console.log('');
    console.log('Examples:');
    console.log('  node debug-employee.js create');
    console.log('  node debug-employee.js test-login');
    console.log('  node debug-employee.js delete EMP-001245');
    process.exit();
}
