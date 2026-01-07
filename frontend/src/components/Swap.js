import React, { useState, useEffect } from 'react';
import { swapAPI } from '../services/api';
import './Swap.css';

const TOKENS = {
  TUSD: { address: process.env.REACT_APP_TUSD_ADDRESS || '0xA9233751245AFB7420B6AE108dF94E63418aD4d9', name: 'Test USD', symbol: 'TUSD' },
  TBROWN: { address: process.env.REACT_APP_TBROWN_ADDRESS || '0x0e96A9D425bedEC3807CEb0aaA0825Aab5cF7Ea4', name: 'Test Brown', symbol: 'TBROWN' },
  TSMART: { address: process.env.REACT_APP_TSMART_ADDRESS || '0x3F35Ff1a1C3AbfBc916dECde3DC08b2bFFFe8900', name: 'Test Smart', symbol: 'TSMART' },
  TZANDO: { address: process.env.REACT_APP_TZANDO_ADDRESS || '0x2c0832A61271eA2E989B90202219ffB630c00901', name: 'Test Zando', symbol: 'TZANDO' },
};

function Swap({ user }) {
  const [tokenIn, setTokenIn] = useState('TUSD');
  const [tokenOut, setTokenOut] = useState('TBROWN');
  const [amountIn, setAmountIn] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [balances, setBalances] = useState({});

  useEffect(() => {
    if (user) {
      loadBalances();
    }
  }, [user]);

  const loadBalances = async () => {
    try {
      const tokenAddresses = Object.values(TOKENS).map(t => t.address);
      const result = await swapAPI.getBalances(tokenAddresses);
      
      // Map addresses back to token symbols
      const balanceMap = {};
      Object.keys(TOKENS).forEach(key => {
        const address = TOKENS[key].address;
        balanceMap[key] = result.data?.tokens?.[address] || '0';
      });
      setBalances(balanceMap);
    } catch (err) {
      console.error('Failed to load balances:', err);
    }
  };

  const handleSwap = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!amountIn || parseFloat(amountIn) <= 0) {
      setError('Please enter a valid amount');
      return;
    }

    if (!password) {
      setError('Password is required to execute swap');
      return;
    }

    if (tokenIn === tokenOut) {
      setError('Cannot swap same token');
      return;
    }

    setLoading(true);

    try {
      const result = await swapAPI.swap(
        TOKENS[tokenIn].address,
        TOKENS[tokenOut].address,
        amountIn,
        password
      );

      setSuccess(`Swap successful! ${result.data.amountIn} ${tokenIn} → ${result.data.amountOut} ${tokenOut}`);
      setAmountIn('');
      setPassword('');
      
      // Reload balances after swap
      setTimeout(loadBalances, 1000);
    } catch (err) {
      setError(err.response?.data?.error || 'Swap failed');
    } finally {
      setLoading(false);
    }
  };

  const switchTokens = () => {
    setTokenIn(tokenOut);
    setTokenOut(tokenIn);
  };

  return (
    <div className="swap-container">
      <div className="swap-card">
        <h2>🔄 Swap Tokens</h2>
        
        {balances && Object.keys(balances).length > 0 && (
          <div className="balances-section">
            <h3>Your Balances</h3>
            <div className="balance-grid">
              {Object.keys(TOKENS).map((key) => (
                <div key={key} className="balance-item">
                  <span className="token-symbol">{TOKENS[key].symbol}</span>
                  <span className="balance-amount">{balances[key] || '0'}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <form onSubmit={handleSwap}>
          <div className="swap-inputs">
            <div className="swap-input-group">
              <label>From</label>
              <div className="input-with-select">
                <input
                  type="number"
                  value={amountIn}
                  onChange={(e) => setAmountIn(e.target.value)}
                  placeholder="0.0"
                  step="any"
                  required
                />
                <select value={tokenIn} onChange={(e) => setTokenIn(e.target.value)}>
                  {Object.keys(TOKENS).map((key) => (
                    <option key={key} value={key}>
                      {TOKENS[key].symbol}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <button type="button" onClick={switchTokens} className="switch-button">
              ⇅
            </button>

            <div className="swap-input-group">
              <label>To</label>
              <div className="input-with-select">
                <input
                  type="text"
                  value="~"
                  disabled
                  placeholder="Output amount"
                />
                <select value={tokenOut} onChange={(e) => setTokenOut(e.target.value)}>
                  {Object.keys(TOKENS).map((key) => (
                    <option key={key} value={key}>
                      {TOKENS[key].symbol}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div className="form-group">
            <label>Password (to unlock wallet)</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              required
            />
          </div>

          {error && <div className="error-message">{error}</div>}
          {success && <div className="success-message">{success}</div>}

          <button type="submit" disabled={loading} className="btn-primary">
            {loading ? 'Swapping...' : 'Swap'}
          </button>
        </form>

        <div className="info-box">
          <p>💡 This swap uses the Uniswap V4 PoolManager with WorkingSwapRouter</p>
          <p>📊 Pool fee: 0.3% (3000 basis points)</p>
        </div>
      </div>
    </div>
  );
}

export default Swap;
