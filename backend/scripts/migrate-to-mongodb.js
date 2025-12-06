import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { createReadStream } from 'fs';
import csv from 'csv-parser';
import { connectMongoDB } from '../src/database/connection.js';
import { User, Wallet, Portfolio, Position, Order, Basket, Ledger, StockData } from '../src/database/models/index.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const STORAGE_DIR = path.join(__dirname, '../src/storage');
const DATA_DIR = path.join(__dirname, '../../data');
const DATA_DIR = path.join(__dirname, '../../data');

async function loadJson(filePath) {
  try {
    const data = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(data);
  } catch {
    return null;
  }
}

async function migrate() {
  console.log('🚀 Starting migration to MongoDB...\n');

  try {
    // Connect to MongoDB
    await connectMongoDB();
    console.log('✅ Connected to MongoDB\n');

    // Load file-based data
    const users = await loadJson(path.join(STORAGE_DIR, 'users.json')) || {};
    const wallets = await loadJson(path.join(STORAGE_DIR, 'wallets.json')) || {};
    const portfolios = await loadJson(path.join(STORAGE_DIR, 'portfolios.json')) || {};
    const positions = await loadJson(path.join(STORAGE_DIR, 'positions.json')) || {};
    const orders = await loadJson(path.join(STORAGE_DIR, 'orders.json')) || {};
    const baskets = await loadJson(path.join(STORAGE_DIR, 'baskets.json')) || {};
    const ledger = await loadJson(path.join(STORAGE_DIR, 'ledger.json')) || [];

    let migrated = 0;
    let skipped = 0;

    // Migrate Users
    console.log('📦 Migrating users...');
    for (const [userId, userData] of Object.entries(users)) {
      try {
        const exists = await User.findOne({ userId });
        if (!exists) {
          await User.create({
            userId: userData.userId || userId,
            email: userData.email,
            passwordHash: userData.passwordHash,
            role: userData.role || 'investor',
            riskProfile: userData.riskProfile || 'moderate',
            investmentHorizon: userData.investmentHorizon || 'medium',
            createdAt: userData.createdAt ? new Date(userData.createdAt) : new Date()
          });
          migrated++;
        } else {
          skipped++;
        }
      } catch (error) {
        console.error(`Error migrating user ${userId}:`, error.message);
      }
    }
    console.log(`   ✅ Migrated ${migrated} users, skipped ${skipped} (already exist)\n`);

    // Migrate Wallets
    migrated = 0;
    skipped = 0;
    console.log('💰 Migrating wallets...');
    for (const [walletId, walletData] of Object.entries(wallets)) {
      try {
        const exists = await Wallet.findOne({ walletId });
        if (!exists) {
          await Wallet.create({
            walletId: walletData.walletId || walletId,
            userId: walletData.userId,
            availableBalance: walletData.availableBalance || 0,
            lockedBalance: walletData.lockedBalance || 0,
            createdAt: walletData.createdAt ? new Date(walletData.createdAt) : new Date()
          });
          migrated++;
        } else {
          skipped++;
        }
      } catch (error) {
        console.error(`Error migrating wallet ${walletId}:`, error.message);
      }
    }
    console.log(`   ✅ Migrated ${migrated} wallets, skipped ${skipped} (already exist)\n`);

    // Migrate Portfolios
    migrated = 0;
    skipped = 0;
    console.log('📊 Migrating portfolios...');
    for (const [portfolioId, portfolioData] of Object.entries(portfolios)) {
      try {
        const exists = await Portfolio.findOne({ portfolioId });
        if (!exists) {
          await Portfolio.create({
            portfolioId: portfolioData.portfolioId || portfolioId,
            userId: portfolioData.userId,
            name: portfolioData.name || 'Default Portfolio',
            createdAt: portfolioData.createdAt ? new Date(portfolioData.createdAt) : new Date()
          });
          migrated++;
        } else {
          skipped++;
        }
      } catch (error) {
        console.error(`Error migrating portfolio ${portfolioId}:`, error.message);
      }
    }
    console.log(`   ✅ Migrated ${migrated} portfolios, skipped ${skipped} (already exist)\n`);

    // Migrate Positions
    migrated = 0;
    skipped = 0;
    console.log('📈 Migrating positions...');
    for (const [positionId, positionData] of Object.entries(positions)) {
      try {
        const exists = await Position.findOne({ positionId });
        if (!exists) {
          await Position.create({
            positionId: positionData.positionId || positionId,
            portfolioId: positionData.portfolioId,
            ticker: positionData.ticker,
            shares: positionData.shares || 0,
            avgCost: positionData.avgCost || 0,
            currentPrice: positionData.currentPrice || positionData.avgCost || 0,
            lastTradePrice: positionData.lastTradePrice || positionData.avgCost || 0,
            createdAt: positionData.createdAt ? new Date(positionData.createdAt) : new Date()
          });
          migrated++;
        } else {
          skipped++;
        }
      } catch (error) {
        console.error(`Error migrating position ${positionId}:`, error.message);
      }
    }
    console.log(`   ✅ Migrated ${migrated} positions, skipped ${skipped} (already exist)\n`);

    // Migrate Orders
    migrated = 0;
    skipped = 0;
    console.log('📝 Migrating orders...');
    for (const [orderId, orderData] of Object.entries(orders)) {
      try {
        const exists = await Order.findOne({ orderId });
        if (!exists) {
          await Order.create({
            orderId: orderData.orderId || orderId,
            userId: orderData.userId,
            ticker: orderData.ticker,
            quantity: orderData.quantity,
            side: orderData.side,
            orderType: orderData.orderType || 'market',
            price: orderData.price,
            totalValue: orderData.totalValue,
            status: orderData.status || 'pending',
            executedAt: orderData.executedAt ? new Date(orderData.executedAt) : null,
            cancelledAt: orderData.cancelledAt ? new Date(orderData.cancelledAt) : null,
            createdAt: orderData.createdAt ? new Date(orderData.createdAt) : new Date()
          });
          migrated++;
        } else {
          skipped++;
        }
      } catch (error) {
        console.error(`Error migrating order ${orderId}:`, error.message);
      }
    }
    console.log(`   ✅ Migrated ${migrated} orders, skipped ${skipped} (already exist)\n`);

    // Migrate Baskets
    migrated = 0;
    skipped = 0;
    console.log('🛒 Migrating baskets...');
    for (const [basketId, basketData] of Object.entries(baskets)) {
      try {
        const exists = await Basket.findOne({ basketId });
        if (!exists) {
          await Basket.create({
            basketId: basketData.basketId || basketId,
            symbol: basketData.symbol,
            orders: basketData.orders || [],
            status: basketData.status || 'active',
            executedAt: basketData.executedAt ? new Date(basketData.executedAt) : null,
            createdAt: basketData.createdAt ? new Date(basketData.createdAt) : new Date()
          });
          migrated++;
        } else {
          skipped++;
        }
      } catch (error) {
        console.error(`Error migrating basket ${basketId}:`, error.message);
      }
    }
    console.log(`   ✅ Migrated ${migrated} baskets, skipped ${skipped} (already exist)\n`);

    // Migrate Ledger
    migrated = 0;
    skipped = 0;
    console.log('📋 Migrating ledger entries...');
    for (const entry of ledger) {
      try {
        const ledgerId = entry.ledgerId || entry.txId || `ledger_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const exists = await Ledger.findOne({ ledgerId });
        if (!exists) {
          await Ledger.create({
            ledgerId,
            userId: entry.userId || entry.walletId, // Handle both formats
            transactionType: entry.transactionType || (entry.debit ? 'trade' : 'deposit'),
            amount: entry.amount || (entry.credit - (entry.debit || 0)),
            description: entry.description,
            orderId: entry.orderId,
            createdAt: entry.timestamp ? new Date(entry.timestamp) : new Date()
          });
          migrated++;
        } else {
          skipped++;
        }
      } catch (error) {
        console.error(`Error migrating ledger entry:`, error.message);
      }
    }
    console.log(`   ✅ Migrated ${migrated} ledger entries, skipped ${skipped} (already exist)\n`);

    // Migrate Stock Data Files
    migrated = 0;
    skipped = 0;
    console.log('📊 Migrating stock data files...');
    try {
      const files = await fs.readdir(DATA_DIR);
      const txtFiles = files.filter(f => f.endsWith('.txt') || f.endsWith('.TXT'));
      console.log(`   Found ${txtFiles.length} stock data files to process...\n`);

      for (const fileName of txtFiles) {
        try {
          const tickerMatch = fileName.match(/^(.+?)\.(us\.)?txt$/i);
          if (!tickerMatch) {
            console.warn(`   ⚠️  Skipping file with unexpected format: ${fileName}`);
            continue;
          }

          const ticker = tickerMatch[1].toUpperCase();
          const filePath = path.join(DATA_DIR, fileName);
          
          // Check if ticker already has data in MongoDB
          const existingCount = await StockData.countDocuments({ ticker });
          if (existingCount > 0) {
            console.log(`   ⏭️  Skipping ${ticker} (${existingCount} records already exist)`);
            skipped++;
            continue;
          }

          // Read and parse CSV file
          const records = [];
          await new Promise((resolve, reject) => {
            createReadStream(filePath)
              .pipe(csv({
                skipLinesWithError: false,
                headers: ['ticker', 'period', 'date', 'time', 'open', 'high', 'low', 'close', 'volume', 'openint']
              }))
              .on('data', (row) => {
                // Skip header row if it looks like headers
                if (row.ticker && (row.ticker.includes('TICKER') || row.ticker === 'Ticker')) {
                  return;
                }
                
                // Only add rows with valid data
                if (row.date && row.close && !isNaN(parseFloat(row.close))) {
                  records.push({
                    ticker: ticker,
                    date: row.date,
                    open: parseFloat(row.open) || 0,
                    high: parseFloat(row.high) || 0,
                    low: parseFloat(row.low) || 0,
                    close: parseFloat(row.close) || 0,
                    volume: parseFloat(row.volume) || 0
                  });
                }
              })
              .on('end', resolve)
              .on('error', reject);
          });

          if (records.length > 0) {
            // Insert in batches to avoid memory issues
            const batchSize = 1000;
            for (let i = 0; i < records.length; i += batchSize) {
              const batch = records.slice(i, i + batchSize);
              await StockData.insertMany(batch, { ordered: false }).catch(err => {
                // Ignore duplicate key errors
                if (err.code !== 11000) {
                  throw err;
                }
              });
            }
            migrated += records.length;
            console.log(`   ✅ Migrated ${ticker}: ${records.length} records`);
          } else {
            console.warn(`   ⚠️  No valid data found in ${fileName}`);
          }
        } catch (error) {
          console.error(`   ❌ Error processing ${fileName}:`, error.message);
        }
      }
      console.log(`\n   ✅ Stock data migration complete: ${migrated} records migrated, ${skipped} tickers skipped (already exist)\n`);
    } catch (error) {
      if (error.code === 'ENOENT') {
        console.warn('   ⚠️  Data directory not found. Skipping stock data migration.');
      } else {
        console.error('   ❌ Error migrating stock data:', error.message);
      }
    }

    console.log('✅ Migration completed successfully!');
    console.log('\n💡 Note: File-based data is preserved as backup.');
    console.log('   You can delete the JSON files in src/storage/ after verifying MongoDB data.\n');

  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    process.exit(0);
  }
}

migrate();

