const { ethers } = require('ethers');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');

const JWT_SECRET = process.env.JWT_SECRET || 'dex-secret-change-in-production';
const USERS_FILE = path.join(__dirname, '../data/users.json');

class AuthService {
  constructor() {
    this.users = this.loadUsers();
    this.ensureDataDir();
  }

  ensureDataDir() {
    const dataDir = path.dirname(USERS_FILE);
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
  }

  loadUsers() {
    try {
      if (fs.existsSync(USERS_FILE)) {
        const data = fs.readFileSync(USERS_FILE, 'utf8');
        return JSON.parse(data);
      }
    } catch (error) {
      console.error('Error loading users:', error);
    }
    return {};
  }

  saveUsers() {
    try {
      fs.writeFileSync(USERS_FILE, JSON.stringify(this.users, null, 2));
    } catch (error) {
      console.error('Error saving users:', error);
      throw error;
    }
  }

  generateMnemonic() {
    // Generate 12-word mnemonic
    const wallet = ethers.Wallet.createRandom();
    return {
      mnemonic: wallet.mnemonic.phrase,
      address: wallet.address,
      privateKey: wallet.privateKey
    };
  }

  async register(username, password, isAdmin = false) {
    // Check if user already exists
    if (this.users[username]) {
      throw new Error('Username already exists');
    }

    // Validate input
    if (!username || username.length < 3) {
      throw new Error('Username must be at least 3 characters');
    }
    if (!password || password.length < 6) {
      throw new Error('Password must be at least 6 characters');
    }

    // Generate wallet with mnemonic
    const walletData = this.generateMnemonic();

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Store user data
    this.users[username] = {
      username,
      passwordHash,
      address: walletData.address,
      role: isAdmin ? 'admin' : 'user',
      // WARNING: In production, encrypt these with user's password or use secure key management
      encryptedMnemonic: this.encryptMnemonic(walletData.mnemonic, password),
      createdAt: new Date().toISOString()
    };

    this.saveUsers();

    // Generate JWT token
    const token = this.generateToken(username, walletData.address, isAdmin ? 'admin' : 'user');

    return {
      username,
      address: walletData.address,
      role: isAdmin ? 'admin' : 'user',
      mnemonic: walletData.mnemonic, // Only returned on registration
      token
    };
  }

  async login(username, password) {
    // Check if user exists
    const user = this.users[username];
    if (!user) {
      throw new Error('Invalid username or password');
    }

    // Verify password
    const isValid = await bcrypt.compare(password, user.passwordHash);
    if (!isValid) {
      throw new Error('Invalid username or password');
    }

    // Generate new token
    const token = this.generateToken(username, user.address, user.role || 'user');

    return {
      username: user.username,
      address: user.address,
      role: user.role || 'user',
      token
    };
  }

  generateToken(username, address, role = 'user') {
    return jwt.sign(
      { username, address, role },
      JWT_SECRET,
      { expiresIn: '24h' }
    );
  }

  verifyToken(token) {
    try {
      return jwt.verify(token, JWT_SECRET);
    } catch (error) {
      throw new Error('Invalid or expired token');
    }
  }

  getUserByUsername(username) {
    return this.users[username];
  }

  getUserWallet(username, password) {
    const user = this.users[username];
    if (!user) {
      throw new Error('User not found');
    }

    // Decrypt mnemonic
    const mnemonic = this.decryptMnemonic(user.encryptedMnemonic, password);
    
    // Create wallet from mnemonic
    return ethers.Wallet.fromPhrase(mnemonic);
  }

  // Simple encryption (in production, use proper encryption like crypto-js with AES)
  encryptMnemonic(mnemonic, password) {
    // This is a simple XOR-based encryption for demo
    // In production, use proper encryption library
    const key = Buffer.from(password.padEnd(32, '0')).toString('base64');
    return Buffer.from(mnemonic).toString('base64') + '.' + key.substring(0, 16);
  }

  decryptMnemonic(encrypted, password) {
    // Simple decryption for demo
    // In production, use proper decryption
    const [mnemonicB64] = encrypted.split('.');
    return Buffer.from(mnemonicB64, 'base64').toString('utf8');
  }

  getAllUsers() {
    return Object.keys(this.users).map(username => ({
      username,
      address: this.users[username].address,
      role: this.users[username].role || 'user',
      createdAt: this.users[username].createdAt
    }));
  }

  isAdmin(username) {
    const user = this.users[username];
    return user && user.role === 'admin';
  }

  createFirstAdmin(username, password) {
    // Only create admin if no users exist
    if (Object.keys(this.users).length === 0) {
      return this.register(username, password, true);
    }
    throw new Error('Admin already exists');
  }
}

module.exports = new AuthService();
