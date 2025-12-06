import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TEST_STORAGE_DIR = path.join(__dirname, '../../src/storage/test');

export async function setupTestStorage() {
  try {
    await fs.mkdir(TEST_STORAGE_DIR, { recursive: true });
    
    // Initialize empty test storage files
    const testFiles = {
      users: {},
      portfolios: {},
      positions: {},
      orders: {},
      wallets: {},
      ledger: [],
      baskets: {}
    };
    
    for (const [key, value] of Object.entries(testFiles)) {
      const filePath = path.join(TEST_STORAGE_DIR, `${key}.json`);
      await fs.writeFile(filePath, JSON.stringify(value, null, 2));
    }
  } catch (error) {
    console.error('Error setting up test storage:', error);
  }
}

export async function cleanupTestStorage() {
  try {
    const files = await fs.readdir(TEST_STORAGE_DIR);
    for (const file of files) {
      await fs.unlink(path.join(TEST_STORAGE_DIR, file));
    }
    await fs.rmdir(TEST_STORAGE_DIR);
  } catch (error) {
    // Ignore errors during cleanup
  }
}

export function createMockStockData(ticker, days = 100) {
  const data = [];
  const basePrice = 100;
  
  for (let i = 0; i < days; i++) {
    const date = new Date();
    date.setDate(date.getDate() - (days - i));
    const price = basePrice + (Math.random() * 20 - 10);
    
    data.push({
      ticker: ticker.toUpperCase(),
      date: date.toISOString().split('T')[0],
      open: price + (Math.random() * 2 - 1),
      high: price + Math.random() * 3,
      low: price - Math.random() * 3,
      close: price,
      volume: Math.floor(Math.random() * 1000000) + 100000
    });
  }
  
  return data;
}

