import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { authAPI } from '../services/api';
import './Auth.css';

function Register({ onLogin }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [adminSecret, setAdminSecret] = useState('');
  const [showAdminField, setShowAdminField] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [mnemonic, setMnemonic] = useState('');
  const [showMnemonic, setShowMnemonic] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);

    try {
      const response = await authAPI.register(
        username,
        password,
        showAdminField && adminSecret ? adminSecret : null
      );
      
      setMnemonic(response.data.mnemonic);
      setShowMnemonic(true);
      
      // Auto-login after registration
      onLogin(response.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Registration failed');
      setLoading(false);
    }
  };

  const handleContinue = () => {
    navigate('/');
  };

  if (showMnemonic) {
    return (
      <div className="auth-container">
        <div className="auth-card">
          <h2>🎉 Registration Successful!</h2>
          
          <div className="mnemonic-display">
            <h3>⚠️ SAVE YOUR MNEMONIC PHRASE</h3>
            <p className="warning-text">
              Write down these 12 words and store them safely. You'll need this to recover your wallet!
            </p>
            <div className="mnemonic-words">
              {mnemonic.split(' ').map((word, idx) => (
                <span key={idx} className="mnemonic-word">
                  <span className="word-number">{idx + 1}.</span> {word}
                </span>
              ))}
            </div>
            <p className="info-text">
              This phrase will not be shown again. Make sure to save it securely!
            </p>
          </div>

          <button onClick={handleContinue} className="btn-primary">
            I've Saved My Mnemonic - Continue to DEX
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h2>Register for DEX</h2>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Username</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              placeholder="Choose username"
            />
          </div>

          <div className="form-group">
            <label>Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="Choose password"
              minLength="6"
            />
          </div>

          <div className="form-group">
            <label>Confirm Password</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              placeholder="Confirm password"
            />
          </div>

          <div className="form-group checkbox-group">
            <label>
              <input
                type="checkbox"
                checked={showAdminField}
                onChange={(e) => setShowAdminField(e.target.checked)}
              />
              Register as Admin (first user only)
            </label>
          </div>

          {showAdminField && (
            <div className="form-group">
              <label>Admin Secret</label>
              <input
                type="password"
                value={adminSecret}
                onChange={(e) => setAdminSecret(e.target.value)}
                placeholder="Enter admin secret"
              />
              <small>Only works if you're the first user</small>
            </div>
          )}

          {error && <div className="error-message">{error}</div>}

          <button type="submit" disabled={loading} className="btn-primary">
            {loading ? 'Registering...' : 'Register'}
          </button>
        </form>

        <p className="auth-link">
          Already have an account? <Link to="/login">Login here</Link>
        </p>
      </div>
    </div>
  );
}

export default Register;
