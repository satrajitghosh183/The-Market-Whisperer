const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const { connectDB } = require('./config/db');

// Load env vars
dotenv.config();

// Connect to databases
connectDB();

const app = express();

// Middleware
app.use(cors()); // Allow frontend to connect
app.use(express.json()); // Parse JSON bodies

// --- API Routes ---
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/wallets', require('./routes/walletRoutes'));
app.use('/api/portfolios', require('./routes/portfolioRoutes'));
app.use('/api/orders', require('./routes/orderRoutes'));
app.use('/api/stocks', require('./routes/stockRoutes'));
app.use('/api/news', require('./routes/newsRoutes'));

// Simple health check route
app.get('/', (req, res) => {
  res.send('Programming Finance Backend is running.');
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));