# AI Trading Simulator - Setup Guide

This guide will help you set up and run the complete AI Trading Simulator with integrated frontend and backend.

## Project Structure

```
ProgFinProject/
├── ai-trading-sim-frontend/    # Next.js Frontend
├── config/                      # Database configuration
├── controllers/                 # Backend controllers
├── middleware/                  # Auth middleware
├── models/                      # MongoDB models
├── routes/                      # Express routes
├── services/                    # Additional services
├── quant_service/              # Python quant service
└── server.js                    # Express backend server
```

## Prerequisites

- **Node.js** (v18 or higher)
- **MongoDB** (local or cloud instance)
- **npm** or **yarn**

## Backend Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment Variables

Create a `.env` file in the root directory:

```env
# Server Configuration
PORT=5000

# MongoDB Connection
MONGO_URI=mongodb://localhost:27017/trading-sim
# OR for MongoDB Atlas:
# MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/trading-sim

# JWT Secret (change this to a random secure string)
JWT_SECRET=your_super_secret_jwt_key_change_this

# Redis (if using)
REDIS_HOST=localhost
REDIS_PORT=6379
```

### 3. Start the Backend Server

```bash
npm run dev
```

The backend should now be running on `http://localhost:5000`

## Frontend Setup

### 1. Navigate to Frontend Directory

```bash
cd ai-trading-sim-frontend
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure Environment Variables

Create a `.env.local` file in the `ai-trading-sim-frontend` directory:

```env
NEXT_PUBLIC_API_URL=http://localhost:5000
```

### 4. Start the Frontend Development Server

```bash
npm run dev
```

The frontend should now be running on `http://localhost:3000`

## Features

### 🔐 Authentication
- **JWT-based authentication** with secure token storage
- User registration and login
- Protected routes and API endpoints

### 💰 Wallet Management
- Virtual trading balance
- Deposit and withdraw funds (sandbox mode)
- Real-time balance updates

### 📈 Trading
- **Buy and sell stocks** with market orders
- Real-time stock data from **Yahoo Finance API** (free, no API key needed)
- **TradingView charts** integration for advanced technical analysis
- Track your positions and P&L

### 📊 Portfolio Management
- View all your open positions
- Real-time profit/loss calculations
- Performance metrics and returns
- Position details with current market prices

### 🎯 Stock Search
- Search any stock by ticker symbol
- Popular stock quick access
- Real-time price updates

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/me` - Get current user (protected)

### Wallet
- `GET /api/wallets/me` - Get user wallet (protected)
- `POST /api/wallets/deposit` - Deposit funds (protected)
- `POST /api/wallets/withdraw` - Withdraw funds (protected)

### Orders
- `POST /api/orders/buy` - Place buy order (protected)
- `POST /api/orders/sell` - Place sell order (protected)

### Portfolio
- `GET /api/portfolios/positions` - Get all positions (protected)

## Technology Stack

### Backend
- **Express.js** - Web framework
- **MongoDB** - Database
- **Mongoose** - ODM
- **JWT** - Authentication
- **bcryptjs** - Password hashing

### Frontend
- **Next.js 14** - React framework
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling
- **TradingView** - Advanced charts
- **Yahoo Finance API** - Real market data
- **Zustand** (if needed for state management)

## Usage Guide

### 1. Register an Account
1. Navigate to `http://localhost:3000`
2. Click "Register"
3. Fill in your details and create an account

### 2. Add Funds to Wallet
1. Click "Wallet" in the navigation
2. Enter an amount in the "Deposit Funds" section
3. Click "Deposit"

### 3. Search for Stocks
1. Use the search bar on the dashboard
2. Or click on popular stock tickers (AAPL, TSLA, etc.)

### 4. Buy Stocks
1. Navigate to a stock page
2. Click "Buy [TICKER]"
3. Enter quantity and confirm price
4. Click "Buy" to execute the order

### 5. View Portfolio
1. Click "Portfolio" in the navigation
2. See all your positions with P&L
3. Click on any ticker to trade

### 6. Sell Stocks
1. Navigate to a stock you own
2. Click "Sell [TICKER]"
3. Enter quantity and confirm price
4. Click "Sell" to execute the order

## Troubleshooting

### Backend Issues

**MongoDB Connection Error**
- Ensure MongoDB is running: `mongod` or check your Atlas connection string
- Verify `MONGO_URI` in `.env` is correct

**Port Already in Use**
- Change the `PORT` in `.env` to a different port (e.g., 5001)
- Kill the process using the port: `lsof -ti:5000 | xargs kill -9` (Mac/Linux)

### Frontend Issues

**Cannot Connect to Backend**
- Verify backend is running on `http://localhost:5000`
- Check `NEXT_PUBLIC_API_URL` in `.env.local`
- Ensure CORS is enabled in backend

**TradingView Chart Not Loading**
- Check internet connection (TradingView widget requires external scripts)
- Try refreshing the page

**Yahoo Finance Data Not Loading**
- The free Yahoo Finance API may have rate limits
- Check browser console for errors
- Stock ticker must be valid

## Development Tips

### Hot Reload
Both frontend and backend support hot reload:
- Frontend: Saved changes auto-refresh
- Backend: Uses `nodemon` for auto-restart

### Testing API Endpoints
Use tools like Postman or curl:

```bash
# Register user
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Test","email":"test@test.com","password":"test123"}'

# Login
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"test123"}'
```

## Production Deployment

### Backend (e.g., Heroku, Railway, Render)
1. Set environment variables on hosting platform
2. Ensure MongoDB connection string is correct
3. Update CORS settings for production frontend URL

### Frontend (e.g., Vercel, Netlify)
1. Set `NEXT_PUBLIC_API_URL` to production backend URL
2. Deploy from `ai-trading-sim-frontend` directory
3. Ensure build passes successfully

## Security Notes

- **Never commit `.env` files** - They're in `.gitignore` for a reason
- **Change default JWT_SECRET** - Use a strong random string
- **Use HTTPS in production** - Especially for authentication
- **Validate all inputs** - Both frontend and backend
- **Rate limiting** - Consider adding for production

## Contributing

This is a learning/demo project. Feel free to:
- Add new features
- Improve error handling
- Add tests
- Enhance UI/UX

## License

MIT License - Feel free to use this project for learning and development.

---

**Need Help?** Check the console logs in both frontend (browser) and backend (terminal) for detailed error messages.

