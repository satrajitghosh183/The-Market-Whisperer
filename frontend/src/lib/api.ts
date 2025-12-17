const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
}

class ApiClient {
  private token: string | null = null;

  setToken(token: string | null) {
    this.token = token;
    if (typeof window !== 'undefined') {
      if (token) {
        localStorage.setItem('token', token);
      } else {
        localStorage.removeItem('token');
      }
    }
  }

  getToken(): string | null {
    if (this.token) return this.token;
    if (typeof window !== 'undefined') {
      return localStorage.getItem('token');
    }
    return null;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const token = this.getToken();
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options.headers,
    };

    try {
      const response = await fetch(`${API_BASE}${endpoint}`, {
        ...options,
        headers,
      });

      const data = await response.json();
      return data;
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'NETWORK_ERROR',
          message: 'Failed to connect to server',
        },
      };
    }
  }

  // Auth
  async register(email: string, password: string, displayName?: string) {
    return this.request<{ user: any; tokens: { accessToken: string } }>(
      '/api/auth/register',
      {
        method: 'POST',
        body: JSON.stringify({ email, password, display_name: displayName }),
      }
    );
  }

  async login(email: string, password: string) {
    return this.request<{ user: any; tokens: { accessToken: string } }>(
      '/api/auth/login',
      {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      }
    );
  }

  async getProfile() {
    return this.request<any>('/api/auth/me');
  }

  // Wallet
  async getWallet() {
    return this.request<any>('/api/wallet');
  }

  async deposit(amount: number, idempotencyKey: string) {
    return this.request<any>('/api/wallet/deposit', {
      method: 'POST',
      body: JSON.stringify({ amount, idempotency_key: idempotencyKey }),
    });
  }

  // Portfolios
  async getPortfolios() {
    return this.request<any[]>('/api/portfolios');
  }

  async createPortfolio(name: string, description?: string) {
    return this.request<any>('/api/portfolios', {
      method: 'POST',
      body: JSON.stringify({ name, description }),
    });
  }

  async getPortfolioValuation(portfolioId: string) {
    return this.request<any>(`/api/portfolios/${portfolioId}/valuation`);
  }

  // Orders
  async getOrders() {
    return this.request<any[]>('/api/orders');
  }

  async createOrder(
    portfolioId: string,
    ticker: string,
    side: 'BUY' | 'SELL',
    quantity: number,
    price: number
  ) {
    return this.request<any>('/api/orders', {
      method: 'POST',
      body: JSON.stringify({
        portfolio_id: portfolioId,
        ticker,
        side,
        quantity,
        price,
      }),
    });
  }

  async settleOrder(orderId: string) {
    return this.request<any>(`/api/orders/${orderId}/settle`, {
      method: 'POST',
    });
  }

  // Market Data
  async getQuote(ticker: string) {
    return this.request<any>(`/api/market/quote/${ticker}`);
  }

  async computeIndicators(ticker: string, windowSize = 20) {
    return this.request<any>('/api/market/indicators', {
      method: 'POST',
      body: JSON.stringify({ ticker, window_size: windowSize }),
    });
  }

  async getExplanation(ticker: string) {
    return this.request<any>('/api/market/explain', {
      method: 'POST',
      body: JSON.stringify({ ticker }),
    });
  }

  // Reports
  async generateReport(
    reportType: string,
    startDate: string,
    endDate: string,
    portfolioId?: string
  ) {
    return this.request<any>('/api/reports', {
      method: 'POST',
      body: JSON.stringify({
        report_type: reportType,
        start_date: startDate,
        end_date: endDate,
        portfolio_id: portfolioId,
      }),
    });
  }

  // Health
  async checkHealth() {
    return this.request<any>('/health');
  }
}

export const api = new ApiClient();

