import React, { useState, useEffect } from 'react';
import { swapAPI, poolAPI } from '../services/api';
import './Balances.css';

const TEST_TOKENS = {
  TUSD: process.env.REACT_APP_TUSD_ADDRESS || '0xA9233751245AFB7420B6AE108dF94E63418aD4d9',
  TBROWN: process.env.REACT_APP_TBROWN_ADDRESS || '0x0e96A9D425bedEC3807CEb0aaA0825Aab5cF7Ea4',
  TSMART: process.env.REACT_APP_TSMART_ADDRESS || '0x3F35Ff1a1C3AbfBc916dECde3DC08b2bFFFe8900',
  TZANDO: process.env.REACT_APP_TZANDO_ADDRESS || '0x2c0832A61271eA2E989B90202219ffB630c00901',
};

// Token prices in TUSD (base currency)
const TOKEN_PRICES = {
  TUSD: 1.00,      // Base currency
  TBROWN: 0.50,    // 1 TBROWN = 0.50 TUSD
  TSMART: 2.00,    // 1 TSMART = 2.00 TUSD
  TZANDO: 1.50,    // 1 TZANDO = 1.50 TUSD
};

function Balances({ user }) {
  const [balances, setBalances] = useState(null);
  const [prices, setPrices] = useState(TOKEN_PRICES);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const loadBalances = async () => {
    try {
      setError('');
      setRefreshing(true);

      // Get all token addresses
      const tokenAddresses = Object.values(TEST_TOKENS);
      
      const response = await swapAPI.getBalances(tokenAddresses);
      
      if (response.success) {
        setBalances(response.data);
      } else {
        setError('Failed to load balances');
      }
    } catch (err) {
      console.error('Error loading balances:', err);
      setError(err.response?.data?.error || 'Failed to load balances');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadBalances();
  }, []);

  const handleRefresh = () => {
    loadBalances();
  };

  const getTokenName = (address) => {
    const entry = Object.entries(TEST_TOKENS).find(([_, addr]) => 
      addr.toLowerCase() === address.toLowerCase()
    );
    return entry ? entry[0] : 'Unknown Token';
  };

  const formatBalance = (balance) => {
    const num = parseFloat(balance);
    if (num === 0) return '0.00';
    if (num < 0.01) return num.toExponential(2);
    return num.toFixed(2);
  };

  const formatPrice = (price) => {
    return `$${price.toFixed(2)}`;
  };

  const getTokenPrice = (tokenName) => {
    return prices[tokenName] || 0;
  };

  const calculateValue = (balance, tokenName) => {
    const num = parseFloat(balance) || 0;
    const price = getTokenPrice(tokenName);
    return num * price;
  };

  const calculateTotalValue = () => {
    if (!balances?.tokens) return 0;
    let total = 0;
    Object.entries(balances.tokens).forEach(([address, balance]) => {
      const tokenName = getTokenName(address);
      total += calculateValue(balance, tokenName);
    });
    return total;
  };

  if (loading) {
    return (
      <div className="balances-container">
        <div className="loading">
          <div className="spinner"></div>
          <p>Loading balances...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="balances-container">
      <div className="balances-header">
        <div>
          <h1>💰 My Balances</h1>
          <p className="subtitle">View your wallet balances</p>
        </div>
        <button 
          onClick={handleRefresh} 
          disabled={refreshing}
          className="btn-refresh"
        >
          {refreshing ? '🔄 Refreshing...' : '🔄 Refresh'}
        </button>
      </div>

      {error && <div className="error-message">{error}</div>}

      {balances && (
        <div className="balances-content">
          {/* Total Portfolio Value */}
          <div className="balance-card total-value">
            <div className="balance-header">
              <span className="token-icon">💎</span>
              <div className="token-info">
                <h3>Total Portfolio Value</h3>
                <p className="token-address">Based on TUSD prices</p>
              </div>
            </div>
            <div className="balance-amount">
              <span className="amount">${calculateTotalValue().toFixed(2)}</span>
              <span className="symbol">TUSD</span>
            </div>
          </div>

          {/* Native Balance Card */}
          <div className="balance-card native-balance">
            <div className="balance-header">
              <span className="token-icon">⚡</span>
              <div className="token-info">
                <h3>Native SEL</h3>
                <p className="token-address">Selendra Network</p>
              </div>
            </div>
            <div className="balance-amount">
              <span className="amount">{formatBalance(balances.native)}</span>
              <span className="symbol">SEL</span>
            </div>
          </div>

          {/* Token Balances */}
          <div className="token-balances">
            <h2>ERC-20 Tokens</h2>
            {Object.entries(balances.tokens || {}).map(([address, balance]) => {
              const tokenName = getTokenName(address);
              const tokenPrice = getTokenPrice(tokenName);
              const tokenValue = calculateValue(balance, tokenName);
              return (
                <div key={address} className="balance-card token-balance">
                  <div className="balance-header">
                    <span className="token-icon">🪙</span>
                    <div className="token-info">
                      <h3>{tokenName}</h3>
                      <p className="token-address" title={address}>
                        {address.substring(0, 10)}...{address.substring(38)}
                      </p>
                      <p className="token-price">Price: {formatPrice(tokenPrice)} TUSD</p>
                    </div>
                  </div>
                  <div className="balance-amount">
                    <span className="amount">{formatBalance(balance)}</span>
                    <span className="symbol">{tokenName}</span>
                    <span className="value">≈ ${tokenValue.toFixed(2)}</span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Wallet Info */}
          <div className="wallet-info">
            <h3>📍 Your Wallet Address</h3>
            <div className="address-display">
              <code>{user.address}</code>
              <button 
                onClick={() => navigator.clipboard.writeText(user.address)}
                className="btn-copy"
                title="Copy address"
              >
                📋
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Balances;
