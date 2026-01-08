  import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000/api';

// Create axios instance with default config
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests if available
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Handle response errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  register: async (username, password, adminSecret = null) => {
    const data = { username, password };
    if (adminSecret) data.adminSecret = adminSecret;
    const response = await api.post('/auth/register', data);
    return response.data;
  },

  login: async (username, password) => {
    const response = await api.post('/auth/login', { username, password });
    if (response.data.data.token) {
      localStorage.setItem('token', response.data.data.token);
      localStorage.setItem('user', JSON.stringify(response.data.data));
    }
    return response.data;
  },

  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  },

  getMe: async () => {
    const response = await api.get('/auth/me');
    return response.data;
  },

  getWallet: async (password) => {
    const response = await api.post('/auth/wallet', { password });
    return response.data;
  },

  getUsers: async () => {
    const response = await api.get('/auth/users');
    return response.data;
  },
};

// Swap API
export const swapAPI = {
  swap: async (tokenIn, tokenOut, amountIn, password) => {
    const response = await api.post('/swap', {
      tokenIn,
      tokenOut,
      amountIn,
      password,
    });
    return response.data;
  },

  getBalances: async (tokenAddresses = []) => {
    const tokens = tokenAddresses.join(',');
    const response = await api.get(`/swap/balances?tokens=${tokens}`);
    return response.data;
  },

  getQuote: async (tokenIn, tokenOut, amountIn) => {
    const response = await api.post('/swap/quote', {
      tokenIn,
      tokenOut,
      amountIn,
    });
    return response.data;
  },
};

// Pool API
export const poolAPI = {
  initialize: async (token0, token1, priceRatio = null) => {
    const data = { token0, token1 };
    if (priceRatio) data.priceRatio = priceRatio;
    const response = await api.post('/pool/initialize', data);
    return response.data;
  },

  getPool: async (token0, token1) => {
    const response = await api.get(`/pool/${token0}/${token1}`);
    return response.data;
  },

  listPools: async (token0Addresses, token1Addresses) => {
    const response = await api.post('/pool/list', {
      token0Addresses,
      token1Addresses,
    });
    return response.data;
  },

  getTokenBalance: async (tokenAddress) => {
    const response = await api.get(`/pool/token/${tokenAddress}/balance`);
    return response.data;
  },
};

// Liquidity API
export const liquidityAPI = {
  add: async (token0, token1, amount0, amount1, password, tickLower = null, tickUpper = null) => {
    const data = { token0, token1, amount0, amount1, password };
    if (tickLower !== null) data.tickLower = tickLower;
    if (tickUpper !== null) data.tickUpper = tickUpper;
    const response = await api.post('/liquidity/add', data);
    return response.data;
  },

  remove: async (token0, token1, liquidityAmount, tickLower = null, tickUpper = null) => {
    const data = { token0, token1, liquidityAmount };
    if (tickLower !== null) data.tickLower = tickLower;
    if (tickUpper !== null) data.tickUpper = tickUpper;
    const response = await api.post('/liquidity/remove', data);
    return response.data;
  },

  get: async (token0, token1) => {
    const response = await api.get(`/liquidity/${token0}/${token1}`);
    return response.data;
  },
};

export default api;
