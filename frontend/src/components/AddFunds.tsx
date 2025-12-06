'use client';

import { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import { API_URL } from '@/config/api';

interface Wallet {
  walletId: string;
  userId: string;
  availableBalance: number;
  lockedBalance: number;
  totalBalance: number;
}

interface TestCard {
  number: string;
  cvc: string;
  description: string;
}

export default function AddFunds() {
  const { user } = useAuth();
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingWallet, setLoadingWallet] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [testCards, setTestCards] = useState<Record<string, TestCard>>({});
  const [showTestCards, setShowTestCards] = useState(false);
  
  // Payment form state
  const [amount, setAmount] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [expMonth, setExpMonth] = useState('');
  const [expYear, setExpYear] = useState('');
  const [cvc, setCvc] = useState('');
  const [cardholderName, setCardholderName] = useState('');
  const [paymentIntentId, setPaymentIntentId] = useState<string | null>(null);
  const [step, setStep] = useState<'amount' | 'payment'>('amount');

  useEffect(() => {
    if (user) {
      fetchWallet();
      fetchTestCards();
    }
  }, [user]);

  const fetchWallet = async () => {
    if (!user?.userId) return;
    
    try {
      setLoadingWallet(true);
      const response = await axios.get(
        `${API_URL}/api/payment/wallet/${user.userId}`
      );
      if (response.data.success && response.data.wallet) {
        setWallet({
          walletId: response.data.wallet.walletId,
          userId: response.data.wallet.userId,
          availableBalance: response.data.wallet.availableBalance || 0,
          lockedBalance: response.data.wallet.lockedBalance || 0,
          totalBalance: response.data.wallet.totalBalance || ((response.data.wallet.availableBalance || 0) + (response.data.wallet.lockedBalance || 0))
        });
      }
    } catch (error) {
      console.error('Error fetching wallet:', error);
    } finally {
      setLoadingWallet(false);
    }
  };

  const fetchTestCards = async () => {
    try {
      const response = await axios.get(
        `${API_URL}/api/payment/test-cards`
      );
      if (response.data.success) {
        setTestCards(response.data.testCards);
      }
    } catch (error) {
      console.error('Error fetching test cards:', error);
    }
  };

  const formatCardNumber = (value: string) => {
    const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
    const matches = v.match(/\d{4,16}/g);
    const match = matches && matches[0] || '';
    const parts = [];
    for (let i = 0, len = match.length; i < len; i += 4) {
      parts.push(match.substring(i, i + 4));
    }
    if (parts.length) {
      return parts.join(' ');
    } else {
      return v;
    }
  };

  const handleAmountSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    const depositAmount = parseFloat(amount);
    if (!depositAmount || depositAmount <= 0) {
      setError('Please enter a valid amount');
      return;
    }

    if (depositAmount > 100000) {
      setError('Maximum deposit amount is $100,000');
      return;
    }

    try {
      setLoading(true);
      const response = await axios.post(
        `${API_URL}/api/payment/create-intent`,
        {
          userId: user?.userId,
          amount: depositAmount,
          currency: 'usd'
        }
      );

      if (response.data.success) {
        setPaymentIntentId(response.data.paymentIntent.id);
        setStep('payment');
      } else {
        setError(response.data.error || 'Failed to create payment intent');
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to initialize payment');
    } finally {
      setLoading(false);
    }
  };

  const handlePaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!paymentIntentId) {
      setError('Payment intent not found. Please start over.');
      return;
    }

    try {
      setLoading(true);
      const response = await axios.post(
        `${API_URL}/api/payment/confirm`,
        {
          userId: user?.userId,
          paymentIntentId,
          paymentMethod: {
            type: 'card',
            cardNumber: cardNumber.replace(/\s/g, ''),
            expMonth: parseInt(expMonth),
            expYear: parseInt(expYear),
            cvc,
            amount: parseFloat(amount),
            currency: 'usd'
          }
        }
      );

      if (response.data.success) {
        const depositAmount = parseFloat(amount) || 0;
        setSuccess(`Successfully deposited $${depositAmount.toFixed(2)}!`);
        
        // Update wallet with response data, ensuring all fields exist
        if (response.data.wallet) {
          setWallet({
            walletId: response.data.wallet.walletId,
            userId: response.data.wallet.userId,
            availableBalance: response.data.wallet.availableBalance || 0,
            lockedBalance: response.data.wallet.lockedBalance || 0,
            totalBalance: (response.data.wallet.availableBalance || 0) + (response.data.wallet.lockedBalance || 0)
          });
        } else {
          // If wallet not in response, refetch it
          await fetchWallet();
        }
        
        // Reset form
        setAmount('');
        setCardNumber('');
        setExpMonth('');
        setExpYear('');
        setCvc('');
        setCardholderName('');
        setPaymentIntentId(null);
        setStep('amount');
      } else {
        setError(response.data.error || 'Payment failed');
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Payment processing failed');
    } finally {
      setLoading(false);
    }
  };

  const useTestCard = (card: TestCard) => {
    setCardNumber(card.number);
    setCvc(card.cvc);
    setExpMonth('12');
    setExpYear((new Date().getFullYear() + 1).toString());
    setCardholderName('Test User');
    setShowTestCards(false);
  };

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 10 }, (_, i) => currentYear + i);

  if (loadingWallet) {
    return <div className="text-center py-8">Loading wallet...</div>;
  }

  return (
    <div className="max-w-2xl mx-auto p-6 bg-white rounded-lg shadow-lg">
      <h2 className="text-2xl font-bold mb-6">Add Funds to Wallet</h2>

      {/* Wallet Balance Display */}
      {wallet && (
        <div className="mb-6 p-4 bg-blue-50 rounded-lg">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-sm text-gray-600">Available Balance</p>
              <p className="text-2xl font-bold text-blue-600">
                ${(wallet.availableBalance || 0).toFixed(2)}
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-600">Total Balance</p>
              <p className="text-xl font-semibold">
                ${(wallet.totalBalance || (wallet.availableBalance || 0) + (wallet.lockedBalance || 0)).toFixed(2)}
              </p>
              {(wallet.lockedBalance || 0) > 0 && (
                <p className="text-xs text-gray-500">
                  ${(wallet.lockedBalance || 0).toFixed(2)} locked
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Success Message */}
      {success && (
        <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg">
          <p className="text-green-800">{success}</p>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-800">{error}</p>
        </div>
      )}

      {/* Step 1: Amount Selection */}
      {step === 'amount' && (
        <form onSubmit={handleAmountSubmit} className="space-y-4">
          <div>
            <label htmlFor="amount" className="block text-sm font-medium text-gray-700 mb-2">
              Deposit Amount
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">$</span>
              <input
                type="number"
                id="amount"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                min="1"
                max="100000"
                step="0.01"
                placeholder="0.00"
                className="w-full pl-8 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>
            <p className="mt-1 text-sm text-gray-500">
              Minimum: $1.00 | Maximum: $100,000.00
            </p>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
          >
            {loading ? 'Processing...' : 'Continue to Payment'}
          </button>
        </form>
      )}

      {/* Step 2: Payment Details */}
      {step === 'payment' && (
        <form onSubmit={handlePaymentSubmit} className="space-y-4">
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
            <p className="text-sm text-yellow-800">
              <strong>⚠️ Development Mode:</strong> This is a fake payment system for testing.
              Use the test cards below or any valid card format.
            </p>
          </div>

          <div>
            <div className="flex justify-between items-center mb-2">
              <label htmlFor="cardNumber" className="block text-sm font-medium text-gray-700">
                Card Number
              </label>
              <button
                type="button"
                onClick={() => setShowTestCards(!showTestCards)}
                className="text-sm text-blue-600 hover:text-blue-700"
              >
                {showTestCards ? 'Hide' : 'Show'} Test Cards
              </button>
            </div>
            {showTestCards && (
              <div className="mb-3 p-3 bg-gray-50 rounded-lg space-y-2">
                {Object.entries(testCards).map(([key, card]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => useTestCard(card)}
                    className="w-full text-left p-2 hover:bg-gray-100 rounded text-sm"
                  >
                    <strong>{key.toUpperCase()}:</strong> {card.number} - {card.description}
                  </button>
                ))}
              </div>
            )}
            <input
              type="text"
              id="cardNumber"
              value={cardNumber}
              onChange={(e) => setCardNumber(formatCardNumber(e.target.value))}
              placeholder="1234 5678 9012 3456"
              maxLength={19}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="expMonth" className="block text-sm font-medium text-gray-700 mb-2">
                Expiry Month
              </label>
              <select
                id="expMonth"
                value={expMonth}
                onChange={(e) => setExpMonth(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              >
                <option value="">Month</option>
                {Array.from({ length: 12 }, (_, i) => i + 1).map((month) => (
                  <option key={month} value={month}>
                    {month.toString().padStart(2, '0')}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="expYear" className="block text-sm font-medium text-gray-700 mb-2">
                Expiry Year
              </label>
              <select
                id="expYear"
                value={expYear}
                onChange={(e) => setExpYear(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              >
                <option value="">Year</option>
                {years.map((year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="cvc" className="block text-sm font-medium text-gray-700 mb-2">
                CVC
              </label>
              <input
                type="text"
                id="cvc"
                value={cvc}
                onChange={(e) => setCvc(e.target.value.replace(/\D/g, ''))}
                placeholder="123"
                maxLength={4}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>

            <div>
              <label htmlFor="cardholderName" className="block text-sm font-medium text-gray-700 mb-2">
                Cardholder Name
              </label>
              <input
                type="text"
                id="cardholderName"
                value={cardholderName}
                onChange={(e) => setCardholderName(e.target.value)}
                placeholder="John Doe"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>
          </div>

          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="flex justify-between text-sm mb-1">
              <span className="text-gray-600">Deposit Amount:</span>
              <span className="font-semibold">${(parseFloat(amount || '0') || 0).toFixed(2)}</span>
            </div>
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => {
                setStep('amount');
                setPaymentIntentId(null);
                setError('');
              }}
              className="flex-1 py-3 px-4 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
            >
              Back
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-3 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
            >
              {loading ? 'Processing Payment...' : 'Complete Payment'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

