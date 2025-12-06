import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import csv from 'csv-parser';
import { createReadStream } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = path.join(__dirname, '../../../data');
const STORAGE_DIR = path.join(__dirname, '../storage');

// Storage files
const USERS_FILE = path.join(STORAGE_DIR, 'users.json');
const PORTFOLIOS_FILE = path.join(STORAGE_DIR, 'portfolios.json');
const POSITIONS_FILE = path.join(STORAGE_DIR, 'positions.json');
const ORDERS_FILE = path.join(STORAGE_DIR, 'orders.json');
const WALLETS_FILE = path.join(STORAGE_DIR, 'wallets.json');
const LEDGER_FILE = path.join(STORAGE_DIR, 'ledger.json');
const BASKETS_FILE = path.join(STORAGE_DIR, 'baskets.json');

let storage = {
  users: {},
  portfolios: {},
  positions: {},
  orders: {},
  wallets: {},
  ledger: [],
  baskets: {}
};

// Initialize storage directory
export async function initializeDataLayer() {
  try {
    await fs.mkdir(STORAGE_DIR, { recursive: true });
    
    // Load existing data
    await loadAllData();
    console.log('✅ Data layer initialized');
  } catch (error) {
    console.error('❌ Error initializing data layer:', error);
    throw error;
  }
}

async function loadAllData() {
  try {
    storage.users = await loadJson(USERS_FILE) || {};
    storage.portfolios = await loadJson(PORTFOLIOS_FILE) || {};
    storage.positions = await loadJson(POSITIONS_FILE) || {};
    storage.orders = await loadJson(ORDERS_FILE) || {};
    storage.wallets = await loadJson(WALLETS_FILE) || {};
    storage.ledger = await loadJson(LEDGER_FILE) || [];
    storage.baskets = await loadJson(BASKETS_FILE) || {};
  } catch (error) {
    console.warn('⚠️ Could not load existing data, starting fresh');
  }
}

async function loadJson(filePath) {
  try {
    const data = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(data);
  } catch {
    return null;
  }
}

async function saveJson(filePath, data) {
  await fs.writeFile(filePath, JSON.stringify(data, null, 2));
}

// Data access methods
export const dataLayer = {
  // Users
  createUser: async (userData) => {
    const userId = userData.userId || `user_${Date.now()}`;
    storage.users[userId] = { ...userData, userId, createdAt: new Date().toISOString() };
    await saveJson(USERS_FILE, storage.users);
    return storage.users[userId];
  },
  
  getUser: async (userId) => storage.users[userId] || null,
  
  getUserByEmail: async (email) => {
    return Object.values(storage.users).find(u => u.email === email) || null;
  },

  updateUser: async (userId, updates) => {
    if (storage.users[userId]) {
      storage.users[userId] = { ...storage.users[userId], ...updates };
      await saveJson(USERS_FILE, storage.users);
      return storage.users[userId];
    }
    return null;
  },

  getAllUsers: async () => {
    return Object.values(storage.users);
  },
  
  // Wallets
  createWallet: async (userId, initialBalance = 0) => {
    const walletId = `wallet_${Date.now()}`;
    storage.wallets[walletId] = {
      walletId,
      userId,
      availableBalance: initialBalance,
      lockedBalance: 0,
      createdAt: new Date().toISOString()
    };
    await saveJson(WALLETS_FILE, storage.wallets);
    return storage.wallets[walletId];
  },
  
  getWallet: async (userId) => {
    return Object.values(storage.wallets).find(w => w.userId === userId) || null;
  },
  
  updateWallet: async (walletId, updates) => {
    if (storage.wallets[walletId]) {
      storage.wallets[walletId] = { ...storage.wallets[walletId], ...updates };
      await saveJson(WALLETS_FILE, storage.wallets);
      return storage.wallets[walletId];
    }
    return null;
  },
  
  // Portfolios
  createPortfolio: async (portfolioData) => {
    const portfolioId = portfolioData.portfolioId || `portfolio_${Date.now()}`;
    storage.portfolios[portfolioId] = {
      ...portfolioData,
      portfolioId,
      createdAt: new Date().toISOString()
    };
    await saveJson(PORTFOLIOS_FILE, storage.portfolios);
    return storage.portfolios[portfolioId];
  },
  
  getPortfolio: async (portfolioId) => storage.portfolios[portfolioId] || null,
  
  getUserPortfolios: async (userId) => {
    return Object.values(storage.portfolios).filter(p => p.userId === userId);
  },
  
  updatePortfolio: async (portfolioId, updates) => {
    if (storage.portfolios[portfolioId]) {
      storage.portfolios[portfolioId] = { ...storage.portfolios[portfolioId], ...updates };
      await saveJson(PORTFOLIOS_FILE, storage.portfolios);
      return storage.portfolios[portfolioId];
    }
    return null;
  },
  
  // Positions
  createPosition: async (positionData) => {
    const positionId = positionData.positionId || `position_${Date.now()}`;
    storage.positions[positionId] = {
      ...positionData,
      positionId,
      createdAt: new Date().toISOString()
    };
    await saveJson(POSITIONS_FILE, storage.positions);
    return storage.positions[positionId];
  },
  
  getPosition: async (positionId) => storage.positions[positionId] || null,
  
  getPortfolioPositions: async (portfolioId) => {
    return Object.values(storage.positions).filter(p => p.portfolioId === portfolioId);
  },
  
  updatePosition: async (positionId, updates) => {
    if (storage.positions[positionId]) {
      storage.positions[positionId] = { ...storage.positions[positionId], ...updates };
      await saveJson(POSITIONS_FILE, storage.positions);
      return storage.positions[positionId];
    }
    return null;
  },
  
  // Orders
  createOrder: async (orderData) => {
    const orderId = orderData.orderId || `order_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    storage.orders[orderId] = {
      ...orderData,
      orderId,
      status: 'pending',
      createdAt: new Date().toISOString()
    };
    await saveJson(ORDERS_FILE, storage.orders);
    return storage.orders[orderId];
  },
  
  getOrder: async (orderId) => storage.orders[orderId] || null,
  
  getUserOrders: async (userId) => {
    return Object.values(storage.orders).filter(o => o.userId === userId);
  },
  
  updateOrder: async (orderId, updates) => {
    if (storage.orders[orderId]) {
      storage.orders[orderId] = { ...storage.orders[orderId], ...updates };
      await saveJson(ORDERS_FILE, storage.orders);
      return storage.orders[orderId];
    }
    return null;
  },
  
  // Ledger
  addLedgerEntry: async (entry) => {
    const txId = `tx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const ledgerEntry = {
      ...entry,
      txId,
      timestamp: new Date().toISOString()
    };
    storage.ledger.push(ledgerEntry);
    await saveJson(LEDGER_FILE, storage.ledger);
    return ledgerEntry;
  },
  
  getLedger: async (walletId) => {
    return storage.ledger.filter(entry => entry.walletId === walletId);
  },
  
  // Baskets
  createBasket: async (basketData) => {
    const basketId = basketData.basketId || `basket_${Date.now()}`;
    storage.baskets[basketId] = {
      ...basketData,
      basketId,
      orders: [],
      createdAt: new Date().toISOString()
    };
    await saveJson(BASKETS_FILE, storage.baskets);
    return storage.baskets[basketId];
  },
  
  getBasket: async (basketId) => storage.baskets[basketId] || null,
  
  updateBasket: async (basketId, updates) => {
    if (storage.baskets[basketId]) {
      storage.baskets[basketId] = { ...storage.baskets[basketId], ...updates };
      await saveJson(BASKETS_FILE, storage.baskets);
      return storage.baskets[basketId];
    }
    return null;
  }
};

// Stock data loader
export async function loadStockData(ticker) {
  const tickerLower = ticker.toLowerCase();
  
  // Try multiple filename formats
  const possibleFiles = [
    `${tickerLower}.us.txt`,
    `${tickerLower}.txt`,
    `${tickerLower}.US.txt`
  ];
  
  let filePath = null;
  
  // Find the first existing file
  for (const fileName of possibleFiles) {
    const testPath = path.join(DATA_DIR, fileName);
    try {
      await fs.access(testPath);
      filePath = testPath;
      break;
    } catch {
      // File doesn't exist, try next format
      continue;
    }
  }
  
  if (!filePath) {
    console.warn(`No data file found for ticker ${ticker}. Tried: ${possibleFiles.join(', ')}`);
    return [];
  }
  
  try {
    const data = [];
    return new Promise((resolve, reject) => {
      const stream = createReadStream(filePath);
      
      stream.on('error', (error) => {
        // Handle file read errors gracefully
        if (error.code === 'ENOENT') {
          console.warn(`File not found: ${filePath}`);
          resolve([]);
        } else {
          console.error(`Error reading file ${filePath}:`, error);
          reject(error);
        }
      });
      
      stream
        .pipe(csv({
          skipLinesWithError: false,
          headers: ['ticker', 'period', 'date', 'time', 'open', 'high', 'low', 'close', 'volume', 'openint']
        }))
        .on('data', (row) => {
          // Skip header row if it looks like headers
          if (row.ticker && row.ticker.includes('TICKER')) {
            return;
          }
          
          // Only add rows with valid data
          if (row.date && row.close && !isNaN(parseFloat(row.close))) {
            data.push({
              ticker: row.ticker || ticker.toUpperCase(),
              date: row.date,
              open: parseFloat(row.open) || 0,
              high: parseFloat(row.high) || 0,
              low: parseFloat(row.low) || 0,
              close: parseFloat(row.close) || 0,
              volume: parseFloat(row.volume) || 0
            });
          }
        })
        .on('end', () => {
          resolve(data);
        })
        .on('error', (error) => {
          console.error(`CSV parsing error for ${ticker}:`, error);
          resolve([]); // Return empty array instead of rejecting
        });
    });
  } catch (error) {
    console.error(`Error loading stock data for ${ticker}:`, error);
    return [];
  }
}

export async function getAvailableTickers() {
  try {
    const files = await fs.readdir(DATA_DIR);
    return files
      .filter(f => f.endsWith('.txt'))
      .map(f => {
        // Handle formats like "aadr.us.txt" -> "AADR" or "aadr.txt" -> "AADR"
        let ticker = f.replace('.txt', '');
        if (ticker.endsWith('.us')) {
          ticker = ticker.replace('.us', '');
        }
        if (ticker.endsWith('.US')) {
          ticker = ticker.replace('.US', '');
        }
        return ticker.toUpperCase();
      })
      .filter(Boolean);
  } catch (error) {
    console.error('Error getting available tickers:', error);
    return [];
  }
}

