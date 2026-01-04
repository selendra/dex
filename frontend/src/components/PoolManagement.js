import React, { useState } from 'react';
import { poolAPI } from '../services/api';
import './Admin.css';

const TOKENS = {
  TOKENS: { address: process.env.REACT_APP_TOKENS_ADDRESS || '0xDc64a140Aa3E981100a9becA4E685f962f0cF6C9', name: 'TokenS', symbol: 'TOKENS' },
  TOKENA: { address: process.env.REACT_APP_TOKENA_ADDRESS || '0x5FC8d32690cc91D4c39d9d3abcBD16989F875707', name: 'TokenA', symbol: 'TOKENA' },
  TOKENB: { address: process.env.REACT_APP_TOKENB_ADDRESS || '0x0165878A594ca255338adfa4d48449f69242Eb8F', name: 'TokenB', symbol: 'TOKENB' },
  TOKENC: { address: process.env.REACT_APP_TOKENC_ADDRESS || '0xa513E6E4b8f2a923D98304ec87F64353C4D5C853', name: 'TokenC', symbol: 'TOKENC' },
};

function PoolManagement({ user }) {
  const [token0, setToken0] = useState('TOKENS');
  const [token1, setToken1] = useState('TOKENA');
  const [priceRatio, setPriceRatio] = useState('1');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleInitialize = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (token0 === token1) {
      setError('Cannot create pool with same token');
      return;
    }

    const ratio = parseFloat(priceRatio);
    if (isNaN(ratio) || ratio <= 0) {
      setError('Price ratio must be a positive number');
      return;
    }

    setLoading(true);

    try {
      const result = await poolAPI.initialize(
        TOKENS[token0].address,
        TOKENS[token1].address,
        ratio
      );

      setSuccess(`Pool initialized successfully: ${token0}/${token1} at ${priceRatio}:1 ratio`);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to initialize pool');
    } finally {
      setLoading(false);
    }
  };

  if (user?.role !== 'admin') {
    return (
      <div className="admin-container">
        <div className="admin-card">
          <h2>🔒 Admin Only</h2>
          <p className="error-message">You need admin privileges to manage pools.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-container">
      <div className="admin-card">
        <h2>🏊 Initialize Pool</h2>
        <p className="admin-badge">Admin Access</p>

        <form onSubmit={handleInitialize}>
          <div className="form-group">
            <label>Token 0</label>
            <select value={token0} onChange={(e) => setToken0(e.target.value)}>
              {Object.keys(TOKENS).map((key) => (
                <option key={key} value={key}>
                  {TOKENS[key].symbol} ({TOKENS[key].name})
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>Token 1</label>
            <select value={token1} onChange={(e) => setToken1(e.target.value)}>
              {Object.keys(TOKENS).map((key) => (
                <option key={key} value={key}>
                  {TOKENS[key].symbol} ({TOKENS[key].name})
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>Initial Price Ratio (Token0:Token1)</label>
            <input
              type="number"
              value={priceRatio}
              onChange={(e) => setPriceRatio(e.target.value)}
              placeholder="1"
              step="any"
              min="0.000001"
            />
            <small>
              Examples: 1 for 1:1 ratio, 10 for 10:1 ratio, 0.5 for 1:2 ratio<br/>
              This sets how many Token1 = 1 Token0
            </small>
          </div>

          {error && <div className="error-message">{error}</div>}
          {success && <div className="success-message">{success}</div>}

          <button type="submit" disabled={loading} className="btn-primary">
            {loading ? 'Initializing...' : 'Initialize Pool'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default PoolManagement;
