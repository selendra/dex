# Authentication System with Auto-Generated Wallets

## Overview
Each user automatically gets a unique Ethereum wallet with a 12-word mnemonic phrase upon registration.

## Setup

### Environment Variables
Add to `.env`:
```bash
JWT_SECRET=your-secret-key-change-in-production
```

## API Endpoints

### 1. Register New User
Creates user account with auto-generated wallet.

```bash
POST /api/auth/register
Content-Type: application/json

{
  "username": "alice",
  "password": "securepassword123"
}
```

**Response:**
```json
{
  "success": true,
  "message": "User registered successfully",
  "data": {
    "username": "alice",
    "address": "0x1234...5678",
    "mnemonic": "word1 word2 word3 ... word12",
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  },
  "warning": "Save your mnemonic phrase securely! It will not be shown again."
}
```

⚠️ **IMPORTANT:** The mnemonic is only shown once during registration. Save it securely!

---

### 2. Login
Get authentication token.

```bash
POST /api/auth/login
Content-Type: application/json

{
  "username": "alice",
  "password": "securepassword123"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "username": "alice",
    "address": "0x1234...5678",
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

---

### 3. Get Current User Info
Requires authentication.

```bash
GET /api/auth/me
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "username": "alice",
    "address": "0x1234...5678",
    "createdAt": "2026-01-04T10:30:00.000Z"
  }
}
```

---

### 4. Get Wallet Details
Retrieve wallet info including mnemonic (requires password).

```bash
POST /api/auth/wallet
Authorization: Bearer <token>
Content-Type: application/json

{
  "password": "securepassword123"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "address": "0x1234...5678",
    "mnemonic": "word1 word2 word3 ... word12"
  },
  "warning": "Keep your mnemonic phrase secure!"
}
```

---

### 5. List All Users
Public endpoint showing all registered addresses.

```bash
GET /api/auth/users
```

**Response:**
```json
{
  "success": true,
  "data": {
    "users": [
      {
        "username": "alice",
        "address": "0x1234...5678",
        "createdAt": "2026-01-04T10:30:00.000Z"
      },
      {
        "username": "bob",
        "address": "0x9876...4321",
        "createdAt": "2026-01-04T11:00:00.000Z"
      }
    ],
    "count": 2
  }
}
```

---

## Authenticated Endpoints

All DEX operations now require authentication:

### Execute Swap (Authenticated)
```bash
POST /api/swap
Authorization: Bearer <token>
Content-Type: application/json

{
  "tokenIn": "0xDc64a140Aa3E981100a9becA4E685f962f0cF6C9",
  "tokenOut": "0x5FC8d32690cc91D4c39d9d3abcBD16989F875707",
  "amountIn": "100",
  "password": "securepassword123"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Swap executed successfully",
  "data": {
    "txHash": "0xabcd...",
    "poolKey": {...},
    "amountIn": "100",
    "zeroForOne": false,
    "gasUsed": "26480",
    "userAddress": "0x1234...5678"
  }
}
```

---

## Complete Usage Flow

### 1. Register
```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "alice",
    "password": "mypassword123"
  }'
```

**Save the response:**
- ✅ Copy the `mnemonic` phrase to safe storage
- ✅ Copy the `token` for API calls
- ✅ Note your wallet `address`

### 2. Execute Swap
```bash
curl -X POST http://localhost:3000/api/swap \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -d '{
    "tokenIn": "0xDc64a140Aa3E981100a9becA4E685f962f0cF6C9",
    "tokenOut": "0x5FC8d32690cc91D4c39d9d3abcBD16989F875707",
    "amountIn": "100",
    "password": "mypassword123"
  }'
```

### 3. Login (Next Session)
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "alice",
    "password": "mypassword123"
  }'
```

---

## Security Features

✅ **Auto-Generated Wallets**
- Each user gets unique Ethereum wallet
- 12-word mnemonic phrase
- HD wallet derivation

✅ **Password Protection**
- Bcrypt hashing (10 rounds)
- Password required for wallet operations
- Encrypted mnemonic storage

✅ **JWT Authentication**
- 24-hour token expiration
- Bearer token authentication
- Secure user sessions

✅ **User Data Storage**
- Stored in `api/data/users.json`
- Encrypted mnemonics
- No plain-text passwords

---

## Important Notes

⚠️ **Production Considerations:**

1. **Change JWT Secret:**
   ```bash
   JWT_SECRET=your-very-secure-random-string
   ```

2. **Secure Mnemonic Storage:**
   - Current implementation uses simple encryption
   - Use proper encryption library (crypto-js with AES)
   - Consider hardware security modules (HSM)

3. **HTTPS Only:**
   - Never send tokens/passwords over HTTP
   - Use TLS/SSL in production

4. **Database:**
   - Replace JSON file with proper database
   - PostgreSQL, MongoDB, etc.

5. **Rate Limiting:**
   - Add rate limiting for registration/login
   - Prevent brute force attacks

---

## Error Handling

**401 Unauthorized:**
```json
{
  "error": "Invalid token",
  "message": "Token expired or invalid"
}
```

**400 Bad Request:**
```json
{
  "error": "Missing required fields",
  "required": ["username", "password"]
}
```

**409 Conflict:**
```json
{
  "error": "Username already exists"
}
```

---

## User Data Structure

```json
{
  "alice": {
    "username": "alice",
    "passwordHash": "$2b$10$...",
    "address": "0x1234...5678",
    "encryptedMnemonic": "base64...",
    "createdAt": "2026-01-04T10:30:00.000Z"
  }
}
```

---

## Testing

```bash
# 1. Start API
npm run api

# 2. Register user
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser","password":"test123456"}'

# 3. Use returned token for authenticated requests
TOKEN="<token_from_registration>"

# 4. Get user info
curl http://localhost:3000/api/auth/me \
  -H "Authorization: Bearer $TOKEN"

# 5. Execute swap with user's wallet
curl -X POST http://localhost:3000/api/swap \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "tokenIn": "0x...",
    "tokenOut": "0x...",
    "amountIn": "100",
    "password": "test123456"
  }'
```
