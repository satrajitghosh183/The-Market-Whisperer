// API service layer for backend communication
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

// Helper function to get auth token from localStorage
const getToken = () => {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('token');
  }
  return null;
};

// Helper function to make authenticated requests
async function fetchWithAuth(url: string, options: RequestInit = {}) {
  const token = getToken();
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_URL}${url}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Request failed' }));
    throw new Error(error.message || 'Request failed');
  }

  return response.json();
}

// Auth API
export const authAPI = {
  register: async (email: string, password: string, name: string) => {
    return fetchWithAuth('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password, name }),
    });
  },

  login: async (email: string, password: string) => {
    return fetchWithAuth('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  },

  getMe: async () => {
    return fetchWithAuth('/api/auth/me');
  },
};

// Wallet API
export const walletAPI = {
  getWallet: async () => {
    return fetchWithAuth('/api/wallets/me');
  },

  deposit: async (amount: number) => {
    return fetchWithAuth('/api/wallets/deposit', {
      method: 'POST',
      body: JSON.stringify({ amount }),
    });
  },

  withdraw: async (amount: number) => {
    return fetchWithAuth('/api/wallets/withdraw', {
      method: 'POST',
      body: JSON.stringify({ amount }),
    });
  },
};

// Order API
export const orderAPI = {
  buy: async (ticker: string, quantity: number, price: number) => {
    return fetchWithAuth('/api/orders/buy', {
      method: 'POST',
      body: JSON.stringify({ ticker, quantity, price }),
    });
  },

  sell: async (ticker: string, quantity: number, price: number) => {
    return fetchWithAuth('/api/orders/sell', {
      method: 'POST',
      body: JSON.stringify({ ticker, quantity, price }),
    });
  },
};

// Portfolio API
export const portfolioAPI = {
  getPositions: async () => {
    return fetchWithAuth('/api/portfolios/positions');
  },
};

// Stock Quote API - using backend endpoint for better reliability
export const yahooFinanceAPI = {
  getQuote: async (ticker: string) => {
    try {
      console.log(`Fetching quote for ${ticker} from backend...`);
      // Use backend endpoint instead of direct Yahoo Finance call
      const response = await fetch(`${API_URL}/api/stocks/quote/${ticker}`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch quote: ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log(`Received quote for ${ticker}:`, data);
      
      return {
        ticker: data.ticker,
        price: data.price,
        change: data.change,
        changePercent: data.changePercent,
        volume: data.volume,
        high: data.high,
        low: data.low,
        open: data.open,
      };
    } catch (error) {
      console.error(`Stock API error for ${ticker}:`, error);
      // Fallback to mock data if API fails
      console.warn(`Using fallback data for ${ticker}`);
      return {
        ticker: ticker.toUpperCase(),
        price: 150 + Math.random() * 100,
        change: (Math.random() - 0.5) * 10,
        changePercent: (Math.random() - 0.5) * 3,
        volume: Math.floor(Math.random() * 50000000),
        high: 160 + Math.random() * 100,
        low: 140 + Math.random() * 100,
        open: 145 + Math.random() * 100,
      };
    }
  },

  getHistoricalData: async (ticker: string, range: string = '1mo') => {
    try {
      const response = await fetch(
        `https://query1.finance.yahoo.com/v8/finance/chart/${ticker}?interval=1d&range=${range}`
      );
      const data = await response.json();
      
      if (data.chart?.result?.[0]) {
        const result = data.chart.result[0];
        const timestamps = result.timestamp;
        const quotes = result.indicators.quote[0];
        
        return timestamps.map((ts: number, i: number) => ({
          date: new Date(ts * 1000),
          open: quotes.open[i],
          high: quotes.high[i],
          low: quotes.low[i],
          close: quotes.close[i],
          volume: quotes.volume[i],
        }));
      }
      throw new Error('No historical data available');
    } catch (error) {
      console.error('Yahoo Finance historical data error:', error);
      return [];
    }
  },
};

// News API
export const newsAPI = {
  getMarketNews: async (limit = 20) => {
    try {
      const response = await fetch(`${API_URL}/api/news/market?limit=${limit}`);
      if (!response.ok) {
        throw new Error('Failed to fetch market news');
      }
      return response.json();
    } catch (error) {
      console.error('News API error:', error);
      throw error;
    }
  },
  getTickerNews: async (ticker: string) => {
    try {
      const response = await fetch(`${API_URL}/api/news/ticker/${ticker}`);
      if (!response.ok) {
        throw new Error(`Failed to fetch news for ${ticker}`);
      }
      return response.json();
    } catch (error) {
      console.error(`News API error for ${ticker}:`, error);
      throw error;
    }
  },
};

