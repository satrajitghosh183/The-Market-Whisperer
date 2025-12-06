import { unifiedDataLayer as dataLayer } from '../data/unifiedDataLayer.js';
import { PortfolioManager } from '../services/portfolioManager.js';
import { TwelveDataService } from '../services/twelveDataService.js';
import { PortfolioPerformanceService } from '../services/portfolioPerformanceService.js';

// Track subscribed tickers and their prices
const tickerSubscriptions = new Map(); // ticker -> Set of WebSocket connections
const tickerPrices = new Map(); // ticker -> { price, timestamp, lastUpdate }

export function setupWebSocket(wss) {
  wss.on('connection', (ws, req) => {
    console.log('✅ WebSocket client connected');
    
    ws.on('message', async (message) => {
      try {
        const data = JSON.parse(message.toString());
        const { type, payload } = data;
        
        switch (type) {
          case 'subscribe_portfolio':
            await handlePortfolioSubscription(ws, payload);
            break;
          
          case 'subscribe_ticker':
            await handleTickerSubscription(ws, payload);
            break;
          
          default:
            ws.send(JSON.stringify({
              type: 'error',
              message: 'Unknown message type'
            }));
        }
      } catch (error) {
        console.error('WebSocket message error:', error);
        ws.send(JSON.stringify({
          type: 'error',
          message: error.message
        }));
      }
    });
    
    ws.on('close', () => {
      console.log('🔌 WebSocket client disconnected');
      
      // Clean up ticker subscriptions
      if (ws.subscribedTickers) {
        ws.subscribedTickers.forEach(ticker => {
          const subscribers = tickerSubscriptions.get(ticker);
          if (subscribers) {
            subscribers.delete(ws);
            if (subscribers.size === 0) {
              tickerSubscriptions.delete(ticker);
            }
          }
        });
      }
    });
    
    ws.on('error', (error) => {
      console.error('WebSocket error:', error);
    });
    
    // Send initial connection confirmation
    ws.send(JSON.stringify({
      type: 'connected',
      timestamp: new Date().toISOString()
    }));
  });
  
  // Broadcast updates periodically
  setInterval(async () => {
    await broadcastMarketUpdates(wss);
  }, 5000); // Every 5 seconds

  // Create portfolio snapshots periodically (every 5 minutes)
  setInterval(async () => {
    await createPortfolioSnapshots(wss);
  }, 300000); // Every 5 minutes
}

async function handlePortfolioSubscription(ws, { portfolioId, userId }) {
  ws.portfolioId = portfolioId;
  ws.userId = userId;
  
  // Send initial portfolio state
  const portfolio = await dataLayer.getPortfolio(portfolioId);
  if (portfolio) {
    const positions = await dataLayer.getPortfolioPositions(portfolioId);
    const totalValue = PortfolioManager.calculateTotalValue(positions);
    const unrealizedPnL = PortfolioManager.calculateUnrealizedPnL(positions);
    
    ws.send(JSON.stringify({
      type: 'portfolio_update',
      portfolio: {
        ...portfolio,
        positions,
        totalValue,
        unrealizedPnL
      },
      timestamp: new Date().toISOString()
    }));
  }
}

async function handleTickerSubscription(ws, { ticker }) {
  if (!ticker) {
    ws.send(JSON.stringify({
      type: 'error',
      message: 'Ticker is required for subscription'
    }));
    return;
  }

  const tickerUpper = ticker.toUpperCase();
  
  if (!ws.subscribedTickers) {
    ws.subscribedTickers = [];
  }
  
  if (!ws.subscribedTickers.includes(tickerUpper)) {
    ws.subscribedTickers.push(tickerUpper);
  }

  // Add WebSocket to ticker subscription set
  if (!tickerSubscriptions.has(tickerUpper)) {
    tickerSubscriptions.set(tickerUpper, new Set());
  }
  tickerSubscriptions.get(tickerUpper).add(ws);

  // Fetch and send initial ticker data
  try {
    const quote = await TwelveDataService.getRealTimeQuote(tickerUpper);
    const price = quote.close || quote.price || 0;
    
    // Cache the price
    tickerPrices.set(tickerUpper, {
      price,
      timestamp: new Date().toISOString(),
      lastUpdate: Date.now(),
      quote
    });

    ws.send(JSON.stringify({
      type: 'ticker_update',
      ticker: tickerUpper,
      price,
      change: quote.change || 0,
      percent_change: quote.percent_change || 0,
      quote,
      timestamp: new Date().toISOString()
    }));
  } catch (error) {
    console.error(`Error fetching initial price for ${tickerUpper}:`, error.message);
    
    // Send cached price if available
    const cached = tickerPrices.get(tickerUpper);
    if (cached) {
      ws.send(JSON.stringify({
        type: 'ticker_update',
        ticker: tickerUpper,
        price: cached.price,
        quote: cached.quote,
        timestamp: cached.timestamp,
        cached: true
      }));
    } else {
      ws.send(JSON.stringify({
        type: 'error',
        message: `Failed to fetch price for ${tickerUpper}: ${error.message}`
      }));
    }
  }
}

async function broadcastMarketUpdates(wss) {
  // Get all connected clients with subscriptions
  const clients = Array.from(wss.clients).filter(ws => ws.readyState === 1);
  
  // Update ticker prices
  const tickersToUpdate = Array.from(tickerSubscriptions.keys());
  const now = Date.now();
  const CACHE_TTL = 30000; // 30 seconds cache

  for (const ticker of tickersToUpdate) {
    try {
      const cached = tickerPrices.get(ticker);
      const needsUpdate = !cached || (now - cached.lastUpdate) > CACHE_TTL;

      if (needsUpdate) {
        try {
          const quote = await TwelveDataService.getRealTimeQuote(ticker);
          const price = quote.close || quote.price || 0;
          
          tickerPrices.set(ticker, {
            price,
            timestamp: new Date().toISOString(),
            lastUpdate: now,
            quote
          });

          // Broadcast to all subscribed clients
          const subscribers = tickerSubscriptions.get(ticker);
          if (subscribers) {
            const update = JSON.stringify({
              type: 'ticker_update',
              ticker,
              price,
              change: quote.change || 0,
              percent_change: quote.percent_change || 0,
              quote,
              timestamp: new Date().toISOString()
            });

            subscribers.forEach(ws => {
              if (ws.readyState === 1) { // WebSocket.OPEN
                try {
                  ws.send(update);
                } catch (error) {
                  console.error(`Error sending update to client for ${ticker}:`, error);
                  subscribers.delete(ws);
                }
              } else {
                subscribers.delete(ws);
              }
            });
          }
        } catch (error) {
          console.error(`Error updating price for ${ticker}:`, error.message);
          // Use cached price if available
          const cached = tickerPrices.get(ticker);
          if (cached) {
            const subscribers = tickerSubscriptions.get(ticker);
            if (subscribers) {
              const update = JSON.stringify({
                type: 'ticker_update',
                ticker,
                price: cached.price,
                quote: cached.quote,
                timestamp: cached.timestamp,
                cached: true
              });

              subscribers.forEach(ws => {
                if (ws.readyState === 1) {
                  try {
                    ws.send(update);
                  } catch (error) {
                    subscribers.delete(ws);
                  }
                } else {
                  subscribers.delete(ws);
                }
              });
            }
          }
        }
      } else {
        // Send cached price to new subscribers
        const subscribers = tickerSubscriptions.get(ticker);
        if (subscribers && cached) {
          const update = JSON.stringify({
            type: 'ticker_update',
            ticker,
            price: cached.price,
            quote: cached.quote,
            timestamp: cached.timestamp,
            cached: true
          });

          subscribers.forEach(ws => {
            if (ws.readyState === 1) {
              try {
                ws.send(update);
              } catch (error) {
                subscribers.delete(ws);
              }
            } else {
              subscribers.delete(ws);
            }
          });
        }
      }
    } catch (error) {
      console.error(`Error processing ticker ${ticker}:`, error);
    }
  }

  // Update portfolio values
  for (const client of clients) {
    try {
      if (client.portfolioId) {
        const portfolio = await dataLayer.getPortfolio(client.portfolioId);
        if (portfolio) {
          const positions = await dataLayer.getPortfolioPositions(client.portfolioId);
          
          // Update position prices from ticker cache
          for (const position of positions) {
            const tickerPrice = tickerPrices.get(position.ticker);
            if (tickerPrice) {
              position.currentPrice = tickerPrice.price;
            }
          }
          
          const totalValue = PortfolioManager.calculateTotalValue(positions);
          const unrealizedPnL = PortfolioManager.calculateUnrealizedPnL(positions);
          
          client.send(JSON.stringify({
            type: 'portfolio_update',
            portfolio: {
              ...portfolio,
              positions,
              totalValue,
              unrealizedPnL
            },
            timestamp: new Date().toISOString()
          }));
        }
      }
    } catch (error) {
      console.error('Error broadcasting portfolio update to client:', error);
    }
  }

  // Clean up disconnected clients from subscriptions
  for (const [ticker, subscribers] of tickerSubscriptions.entries()) {
    subscribers.forEach(ws => {
      if (ws.readyState !== 1) {
        subscribers.delete(ws);
      }
    });
    if (subscribers.size === 0) {
      tickerSubscriptions.delete(ticker);
    }
  }
}

/**
 * Create portfolio snapshots for performance tracking
 */
async function createPortfolioSnapshots(wss) {
  const clients = Array.from(wss.clients).filter(ws => ws.readyState === 1 && ws.portfolioId && ws.userId);
  
  for (const client of clients) {
    try {
      await PortfolioPerformanceService.createSnapshot(client.portfolioId, client.userId);
    } catch (error) {
      console.error(`Error creating snapshot for portfolio ${client.portfolioId}:`, error);
    }
  }
}

