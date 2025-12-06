// API Configuration
// In production, these should be set via Vercel environment variables

export const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://the-market-whisperer.onrender.com';
export const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'wss://the-market-whisperer.onrender.com';

// Validate that we have a proper API URL
if (typeof window !== 'undefined' && !API_URL) {
  console.warn('⚠️ NEXT_PUBLIC_API_URL is not set. Using default backend URL.');
}

