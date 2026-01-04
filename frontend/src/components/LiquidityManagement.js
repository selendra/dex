import React, { useState } from 'react';
import { liquidityAPI } from '../services/api';
import './Admin.css';

const TOKENS = {
  TOKENS: { address: process.env.REACT_APP_TOKENS_ADDRESS || '0xDc64a140Aa3E981100a9becA4E685f962f0cF6C9', name: 'TokenS', symbol: 'TOKENS' },
  TOKENA: { address: process.env.REACT_APP_TOKENA_ADDRESS || '0x5FC8d32690cc91D4c39d9d3abcBD16989F875707', name: 'TokenA', symbol: 'TOKENA' },
  TOKENB: { address: process.env.REACT_APP_TOKENB_ADDRESS || '0x0165878A594ca255338adfa4d48449f69242Eb8F', name: 'TokenB', symbol: 'TOKENB' },
  TOKENC: { address: process.env.REACT_APP_TOKENC_ADDRESS || '0xa513E6E4b8f2a923D98304ec87F64353C4D5C853', name: 'TokenC', symbol: 'TOKENC' },
};

function LiquidityManagement({ user }) {
  const [action, setAction] = useState('add');
  const [token0, setToken0] = useState('TOKENS');
  const [token1, setToken1] = useState('TOKENA');
  const [amount0, setAmount0] = useState('');
  const [amount1, setAmount1] = useState('');
  const [liquidityAmount, setLiquidityAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleAddLiquidity = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!amount0 || !amount1 || parseFloat(amount0) <= 0 || parseFloat(amount1) <= 0) {
      setError('Please enter valid amounts');
      return;
    }

    if (token0 === token1) {
      setError('Cannot add liquidity with same token');
      return;
    }

    setLoading(true);

    try {
      const result = await liquidityAPI.add(
        TOKENS[token0].address,
        TOKENS[token1].address,
        amount0,
        amount1
      );

      setSuccess(`Liquidity added: ${amount0} ${token0} + ${amount1} ${token1}`);
      setAmount0('');
      setAmount1('');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to add liquidity');
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveLiquidity = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!liquidityAmount || parseFloat(liquidityAmount) <= 0) {
      setError('Please enter valid liquidity amount');
      return;
    }

    if (token0 === token1) {
      setError('Cannot remove liquidity with same token');
      return;
    }

    setLoading(true);

    try {
      const result = await liquidityAPI.remove(
        TOKENS[token0].address,
        TOKENS[token1].address,
        liquidityAmount
      );

      setSuccess(`Liquidity removed: ${liquidityAmount} from ${token0}/${token1} pool`);
      setLiquidityAmount('');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to remove liquidity');
    } finally {
      setLoading(false);
    }
  };

  if (user?.role !== 'admin') {
    return (
      <div className="admin-container">
        <div className="admin-card">
          <h2>🔒 Admin Only</h2>
          <p className="error-message">You need admin privileges to manage liquidity.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-container">
      <div className="admin-card">
        <h2>💧 Manage Liquidity</h2>
        <p className="admin-badge">Admin Access</p>

        <div className="action-tabs">
          <button
            className={`tab ${action === 'add' ? 'active' : ''}`}
            onClick={() => setAction('add')}
          >
            Add Liquidity
          </button>
          <button
            className={`tab ${action === 'remove' ? 'active' : ''}`}
            onClick={() => setAction('remove')}
          >
            Remove Liquidity
          </button>
        </div>

        {action === 'add' ? (
          <form onSubmit={handleAddLiquidity}>
            <div className="form-group">
              <label>Token 0</label>
              <select value={token0} onChange={(e) => setToken0(e.target.value)}>
                {Object.keys(TOKENS).map((key) => (
                  <option key={key} value={key}>
                    {TOKENS[key].symbol}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Amount 0</label>
              <input
                type="number"
                value={amount0}
                onChange={(e) => setAmount0(e.target.value)}
                placeholder="1000"
                step="any"
                required
              />
            </div>

            <div className="form-group">
              <label>Token 1</label>
              <select value={token1} onChange={(e) => setToken1(e.target.value)}>
                {Object.keys(TOKENS).map((key) => (
                  <option key={key} value={key}>
                    {TOKENS[key].symbol}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Amount 1</label>
              <input
                type="number"
                value={amount1}
                onChange={(e) => setAmount1(e.target.value)}
                placeholder="1000"
                step="any"
                required
              />
            </div>

            {error && <div className="error-message">{error}</div>}
            {success && <div className="success-message">{success}</div>}

            <button type="submit" disabled={loading} className="btn-primary">
              {loading ? 'Adding...' : 'Add Liquidity'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleRemoveLiquidity}>
            <div className="form-group">
              <label>Token 0</label>
              <select value={token0} onChange={(e) => setToken0(e.target.value)}>
                {Object.keys(TOKENS).map((key) => (
                  <option key={key} value={key}>
                    {TOKENS[key].symbol}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Token 1</label>
              <select value={token1} onChange={(e) => setToken1(e.target.value)}>
                {Object.keys(TOKENS).map((key) => (
                  <option key={key} value={key}>
                    {TOKENS[key].symbol}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Liquidity Amount</label>
              <input
                type="number"
                value={liquidityAmount}
                onChange={(e) => setLiquidityAmount(e.target.value)}
                placeholder="500"
                step="any"
                required
              />
            </div>

            {error && <div className="error-message">{error}</div>}
            {success && <div className="success-message">{success}</div>}

            <button type="submit" disabled={loading} className="btn-primary">
              {loading ? 'Removing...' : 'Remove Liquidity'}
            </button>
          </form>
        )}

        <div className="info-box">
          <p>💡 Liquidity enables trading on the DEX</p>
          <p>📊 Full-range liquidity uses ticks -887220 to 887220</p>
          <p>⚠️ Pool must be initialized before adding liquidity</p>
        </div>
      </div>
    </div>
  );
}

export default LiquidityManagement;
