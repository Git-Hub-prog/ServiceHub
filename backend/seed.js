const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Service = require('./models/Service');
const fs = require('fs');
const path = require('path');

dotenv.config();

const connectDB = require('./config/db');

const seedData = async () => {
  try {
    await connectDB();

    // Read the frontend data file
    const dataPath = path.join(__dirname, '../frontend/js/services-data.js');
    let fileContent = fs.readFileSync(dataPath, 'utf8');
    
    // Convert client-side JS to Node module
    // Remove "const servicesData =" and treat it as a JSON-like object string
    const jsonString = fileContent.replace('const servicesData =', '').trim().replace(/;$/, '');
    
    // Evaluate the string to get the actual array
    // (In a real app, you'd parsing carefully, but here we trust our own frontend file)
    const servicesData = eval(jsonString);

    // Clean existing data
    await Service.deleteMany();

    // Insert new data
    await Service.insertMany(servicesData);

    console.log('Data Seeded Successfully!');
    process.exit();
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
};

seedData();
