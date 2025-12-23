## Setup

1. Install dependencies:
```bash
npm install
```

2. Copy `.env.example` to `.env` and configure:
```bash
cp .env.example .env
```

3. Compile contracts:
```bash
npm run compile
```

4. Run tests:
```bash
npm test
```

## Development

### Run local node:
```bash
npm run node
```

### Deploy to local network:
```bash
npm run deploy:local
```

### Deploy to testnet:
```bash
npm run deploy:testnet
```

## Project Structure

```
dex/
├── contracts/          # Smart contracts
│   ├── core/          # Core contracts (Factory, Pair)
│   ├── periphery/     # Router and helpers
│   └── test/          # Test tokens
├── test/              # Test files
├── scripts/           # Deployment scripts
└── hardhat.config.js  # Hardhat configuration
```

## License

MIT
