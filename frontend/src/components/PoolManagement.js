import React, { useState } from 'react';
import { poolAPI } from '../services/api';
import './Admin.css';

const TOKENS = {
  TUSD: { address: process.env.REACT_APP_TUSD_ADDRESS || '0xA9233751245AFB7420B6AE108dF94E63418aD4d9', name: 'Test USD', symbol: 'TUSD' },
  TBROWN: { address: process.env.REACT_APP_TBROWN_ADDRESS || '0x0e96A9D425bedEC3807CEb0aaA0825Aab5cF7Ea4', name: 'Test Brown', symbol: 'TBROWN' },
  TSMART: { address: process.env.REACT_APP_TSMART_ADDRESS || '0x3F35Ff1a1C3AbfBc916dECde3DC08b2bFFFe8900', name: 'Test Smart', symbol: 'TSMART' },
  TZANDO: { address: process.env.REACT_APP_TZANDO_ADDRESS || '0x2c0832A61271eA2E989B90202219ffB630c00901', name: 'Test Zando', symbol: 'TZANDO' },
};

function PoolManagement({ user }) {
  const [token0, setToken0] = useState('TUSD');
  const [token1, setToken1] = useState('TBROWN');
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
