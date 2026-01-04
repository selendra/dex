const express = require('express');
const router = express.Router();
const authService = require('../services/auth');
const { authenticate } = require('../middleware/auth');

/**
 * POST /api/auth/register
 * Register new user with auto-generated wallet
 * Body: {
 *   username: "alice",
 *   password: "securepassword",
 *   adminSecret: "optional-for-first-admin"
 * }
 */
router.post('/register', async (req, res, next) => {
  try {
    const { username, password, adminSecret } = req.body;

    if (!username || !password) {
      return res.status(400).json({
        error: 'Missing required fields',
        required: ['username', 'password']
      });
    }

    // Check if this is first user and admin secret provided
    const isFirstUser = Object.keys(authService.users).length === 0;
    const isAdmin = isFirstUser && adminSecret === process.env.ADMIN_SECRET;

    const result = await authService.register(username, password, isAdmin);

    res.status(201).json({
      success: true,
      message: `User registered successfully${isAdmin ? ' as ADMIN' : ''}`,
      data: {
        username: result.username,
        address: result.address,
        role: result.role,
        mnemonic: result.mnemonic, // Only shown on registration!
        token: result.token
      },
      warning: 'Save your mnemonic phrase securely! It will not be shown again.'
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/auth/login
 * Login and get JWT token
 * Body: {
 *   username: "alice",
 *   password: "securepassword"
 * }
 */
router.post('/login', async (req, res, next) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({
        error: 'Missing required fields',
        required: ['username', 'password']
      });
    }

    const result = await authService.login(username, password);

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        username: result.username,
        address: result.address,
        role: result.role,
        token: result.token
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/auth/me
 * Get current user info (requires authentication)
 */
router.get('/me', authenticate, (req, res) => {
  const user = authService.getUserByUsername(req.user.username);
  
  res.json({
    success: true,
    data: {
      username: user.username,
      address: user.address,
      createdAt: user.createdAt
    }
  });
});

/**
 * POST /api/auth/wallet
 * Get wallet details (requires authentication and password)
 * Body: {
 *   password: "securepassword"
 * }
 */
router.post('/wallet', authenticate, async (req, res, next) => {
  try {
    const { password } = req.body;

    if (!password) {
      return res.status(400).json({
        error: 'Password required',
        message: 'Password is needed to decrypt wallet'
      });
    }

    // Verify password by attempting login
    await authService.login(req.user.username, password);

    // Get wallet
    const wallet = authService.getUserWallet(req.user.username, password);

    res.json({
      success: true,
      data: {
        address: wallet.address,
        mnemonic: wallet.mnemonic.phrase
      },
      warning: 'Keep your mnemonic phrase secure!'
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/auth/users
 * List all users (public addresses only)
 */
router.get('/users', (req, res) => {
  const users = authService.getAllUsers();
  
  res.json({
    success: true,
    data: {
      users,
      count: users.length
    }
  });
});

module.exports = router;
