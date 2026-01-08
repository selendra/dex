import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, Navigate } from 'react-router-dom';
import { authAPI } from './services/api';
import Login from './components/Login';
import Register from './components/Register';
import Swap from './components/Swap';
import Balances from './components/Balances';
import PoolManagement from './components/PoolManagement';
import LiquidityManagement from './components/LiquidityManagement';
import './App.css';

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if user is logged in
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch (err) {
        localStorage.removeItem('user');
        localStorage.removeItem('token');
      }
    }
    setLoading(false);
  }, []);

  const handleLogin = (userData) => {
    setUser(userData);
  };

  const handleLogout = () => {
    authAPI.logout();
    setUser(null);
  };

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="spinner"></div>
        <p>Loading DEX...</p>
      </div>
    );
  }

  return (
    <Router>
      <div className="app">
        <nav className="navbar">
          <div className="nav-container">
            <Link to="/" className="nav-brand">
              🔷 Uniswap V4 DEX
            </Link>

            <div className="nav-links">
              {user ? (
                <>
                  <Link to="/" className="nav-link">Swap</Link>
                  <Link to="/balances" className="nav-link">Balances</Link>
                  {user.role === 'admin' && (
                    <>
                      <Link to="/pools" className="nav-link">Pools</Link>
                      <Link to="/liquidity" className="nav-link">Liquidity</Link>
                    </>
                  )}
                  <div className="user-info">
                    <span className="user-address" title={user.address}>
                      {user.address?.substring(0, 6)}...{user.address?.substring(38)}
                    </span>
                    {user.role === 'admin' && <span className="admin-tag">ADMIN</span>}
                    <button onClick={handleLogout} className="btn-logout">
                      Logout
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <Link to="/login" className="nav-link">Login</Link>
                  <Link to="/register" className="nav-link btn-register">Register</Link>
                </>
              )}
            </div>
          </div>
        </nav>

        <main className="main-content">
          <Routes>
            <Route
              path="/login"
              element={user ? <Navigate to="/" /> : <Login onLogin={handleLogin} />}
            />
            <Route
              path="/register"
              element={user ? <Navigate to="/" /> : <Register onLogin={handleLogin} />}
            />
            <Route
              path="/"
              element={user ? <Swap user={user} /> : <Navigate to="/login" />}
            />
            <Route
              path="/balances"
              element={user ? <Balances user={user} /> : <Navigate to="/login" />}
            />
            <Route
              path="/pools"
              element={
                user?.role === 'admin' ? (
                  <PoolManagement user={user} />
                ) : (
                  <Navigate to="/" />
                )
              }
            />
            <Route
              path="/liquidity"
              element={
                user?.role === 'admin' ? (
                  <LiquidityManagement user={user} />
                ) : (
                  <Navigate to="/" />
                )
              }
            />
          </Routes>
        </main>

        <footer className="footer">
          <p>Uniswap V4 DEX • Powered by PoolManager & WorkingSwapRouter</p>
          <p className="footer-links">
            <a href="https://github.com" target="_blank" rel="noopener noreferrer">GitHub</a>
            <span>•</span>
            <a href="https://docs.uniswap.org/contracts/v4/overview" target="_blank" rel="noopener noreferrer">
              Uniswap V4 Docs
            </a>
          </p>
        </footer>
      </div>
    </Router>
  );
}

export default App;
