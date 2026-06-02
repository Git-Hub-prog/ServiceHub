const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const path = require('path');
const connectDB = require('./config/db');

// Load environment variables
dotenv.config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../frontend')));
app.use('/frontend', express.static(path.join(__dirname, '../frontend')));

// Routes
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/services', require('./routes/serviceRoutes'));
app.use('/api/bookings', require('./routes/bookingRoutes'));
app.use('/api/partners', require('./routes/partnerRoutes'));
app.use('/api/partner', require('./routes/partnerManagementRoutes'));
app.use('/api/partner/plumber', require('./routes/plumberPartnerRoutes'));
app.use('/api/admin', require('./routes/adminRoutes'));
app.use('/api/reviews', require('./routes/reviewRoutes'));
app.use('/api/employee', require('./routes/employeeRoutes'));


// Root Endpoint
app.get('/api', (req, res) => {
  res.send('API is running...');
});

app.get('/api/health', (req, res) => {
  res.status(200).json({ ok: true, dbState: require('mongoose').connection.readyState });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, async () => {
  console.log(`Server running on port ${PORT}`);

  // Try to connect once at startup; keep server alive even if DB is temporarily down.
  const connected = await connectDB();
  if (!connected) {
    console.warn('Backend started, but MongoDB is not connected yet.');
  }
});
