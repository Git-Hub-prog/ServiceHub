#!/usr/bin/env node

/**
 * Complete Employee Setup Script
 * Creates both Employee and Partner entries for testing
 */

const mongoose = require('mongoose');
require('dotenv').config();

const Employee = require('../models/Employee');
const Partner = require('../models/Partner');
const connectDB = require('../config/db');

async function setupCompleteEmployee() {
  try {
    await connectDB();
    console.log('✅ Connected to MongoDB');

    // Employee credentials
    const employeeData = {
      employeeId: 'EMP-001245',
      fullName: 'Amit Sharma',
      email: 'amit@email.com',
      phone: '+91 98765 43210',
      password: 'password123',
      serviceCategory: 'plumber'
    };

    // Check if employee exists
    let employee = await Employee.findOne({ employeeId: employeeData.employeeId });
    
    if (employee) {
      console.log('⚠️  Employee EMP-001245 already exists, updating...');
      await Employee.findOneAndDelete({ employeeId: employeeData.employeeId });
    }

    // Create Employee
    employee = new Employee({
      employeeId: employeeData.employeeId,
      fullName: employeeData.fullName,
      email: employeeData.email,
      phone: employeeData.phone,
      password: employeeData.password,
      serviceCategory: employeeData.serviceCategory,
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
    console.log('✅ Employee created successfully');

    // Check if partner exists
    let partner = await Partner.findOne({
      $or: [
        { employeeId: employeeData.employeeId },
        { email: employeeData.email }
      ]
    });

    if (partner) {
      console.log('⚠️  Partner already exists, updating...');
      await Partner.findOneAndDelete({
        $or: [
          { employeeId: employeeData.employeeId },
          { email: employeeData.email }
        ]
      });
    }

    // Create Partner
    partner = new Partner({
      employeeId: employeeData.employeeId,
      name: employeeData.fullName,
      email: employeeData.email,
      phone: employeeData.phone,
      service: employeeData.serviceCategory,
      approvalStatus: 'approved',  // IMPORTANT: must be approved
      verifiedByAdmin: true,        // IMPORTANT: must be verified
      isAvailable: true,
      experience: 5,
      address: 'Delhi, India'
    });

    await partner.save();
    console.log('✅ Partner created successfully');

    console.log('\n🎉 Complete setup done!');
    console.log('\n📋 Login Credentials:');
    console.log('   Employee ID: EMP-001245');
    console.log('   Password: password123');
    console.log('\n✨ Employee is now ready to login!');

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    process.exit();
  }
}

setupCompleteEmployee();
