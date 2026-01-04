import React, { useState, useEffect } from 'react';
import { swapAPI } from '../services/api';
import './Balances.css';

const TEST_TOKENS = {
  TOKENS: process.env.REACT_APP_TOKENS_ADDRESS || '0xDc64a140Aa3E981100a9becA4E685f962f0cF6C9',
  TOKENA: process.env.REACT_APP_TOKENA_ADDRESS || '0x5FC8d32690cc91D4c39d9d3abcBD16989F875707',
  TOKENB: process.env.REACT_APP_TOKENB_ADDRESS || '0x0165878A594ca255338adfa4d48449f69242Eb8F',
  TOKENC: process.env.REACT_APP_TOKENC_ADDRESS || '0xa513E6E4b8f2a923D98304ec87F64353C4D5C853',
};

function Balances({ user }) {
  const [balances, setBalances] = useState(null);
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
    if (num < 0.0001) return num.toExponential(4);
    return num.toFixed(6);
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
          {/* Native Balance Card */}
          <div className="balance-card native-balance">
            <div className="balance-header">
              <span className="token-icon">⚡</span>
              <div className="token-info">
                <h3>Native ETH</h3>
                <p className="token-address">Ethereum Network</p>
              </div>
            </div>
            <div className="balance-amount">
              <span className="amount">{formatBalance(balances.native)}</span>
              <span className="symbol">ETH</span>
            </div>
          </div>

          {/* Token Balances */}
          <div className="token-balances">
            <h2>ERC-20 Tokens</h2>
            {Object.entries(balances.tokens || {}).map(([address, balance]) => (
              <div key={address} className="balance-card token-balance">
                <div className="balance-header">
                  <span className="token-icon">🪙</span>
                  <div className="token-info">
                    <h3>{getTokenName(address)}</h3>
                    <p className="token-address" title={address}>
                      {address.substring(0, 10)}...{address.substring(38)}
                    </p>
                  </div>
                </div>
                <div className="balance-amount">
                  <span className="amount">{formatBalance(balance)}</span>
                  <span className="symbol">{getTokenName(address)}</span>
                </div>
              </div>
            ))}
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
