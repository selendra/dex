const hre = require("hardhat");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../../../.env") });

// Contract ABIs
const ERC20_ABI = [
  "function approve(address spender, uint256 amount) returns (bool)",
  "function transfer(address to, uint256 amount) returns (bool)",
  "function balanceOf(address account) view returns (uint256)",
  "function decimals() view returns (uint8)",
  "function symbol() view returns (string)",
  "function name() view returns (string)",
  "function totalSupply() view returns (uint256)",
  "function allowance(address owner, address spender) view returns (uint256)"
];

// Pool configuration constants
const FEE = 3000; // 0.3%
const TICK_SPACING = 1; // Matches defaultTickSpacing in PriceOracle
const HOOKS_ADDRESS = hre.ethers.ZeroAddress;
const SQRT_PRICE_1_1 = "79228162514264337593543950336"; // 1:1 price
const MIN_TICK = -887220;
const MAX_TICK = 887220;

// Test results tracker
const testResults = {
  passed: [],
  failed: []
};

async function logTest(name, success, message = "") {
  if (success) {
    console.log(`  ✅ ${name}`);
    testResults.passed.push(name);
  } else {
    console.log(`  ❌ ${name}: ${message}`);
    testResults.failed.push({ name, message });
  }
}

// Sort tokens by address (currency0 must be lower)
function sortTokens(tokenA, tokenB) {
  const addrA = tokenA.toLowerCase();
  const addrB = tokenB.toLowerCase();
  return addrA < addrB ? [tokenA, tokenB] : [tokenB, tokenA];
}

// Create pool key
function createPoolKey(token0, token1) {
  const [currency0, currency1] = sortTokens(token0, token1);
  return {
    currency0,
    currency1,
    fee: FEE,
    tickSpacing: TICK_SPACING,
    hooks: HOOKS_ADDRESS
  };
}

// Get full-range tick bounds aligned to tick spacing
function getFullRangeTicks(tickSpacing) {
  const tickLower = Math.ceil(MIN_TICK / tickSpacing) * tickSpacing;
  const tickUpper = Math.floor(MAX_TICK / tickSpacing) * tickSpacing;
  return { tickLower, tickUpper };
}

async function main() {
  console.log("═══════════════════════════════════════════════════════════════════");
  console.log("       DEX FULL DEPLOYMENT & TEST SUITE - SELENDRA TESTNET");
  console.log("═══════════════════════════════════════════════════════════════════\n");

  const [deployer] = await hre.ethers.getSigners();
  console.log(`Deployer: ${deployer.address}`);
  
  const balance = await hre.ethers.provider.getBalance(deployer.address);
  console.log(`Balance: ${hre.ethers.formatEther(balance)} SEL\n`);

  if (balance === 0n) {
    console.error("ERROR: Account has no balance!");
    process.exit(1);
  }

  // ═══════════════════════════════════════════════════════════════════
  // STEP 1: DEPLOY TOKENS (if needed)
  // ═══════════════════════════════════════════════════════════════════
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("STEP 1: DEPLOYING TEST TOKENS");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

  const tokenConfigs = [
    { name: "Test USD", symbol: "TUSD", isStable: true },
    { name: "Test Brown", symbol: "TBROWN", isStable: false },
    { name: "Test Smart", symbol: "TSMART", isStable: false },
    { name: "Test Zando", symbol: "TZANDO", isStable: false }
  ];

  const INITIAL_SUPPLY = hre.ethers.parseEther("1000000");
  const tokens = {};

  for (const config of tokenConfigs) {
    const envKey = `SELENDRA_${config.symbol}_ADDRESS`;
    const existingAddr = process.env[envKey];
    
    if (existingAddr && existingAddr.startsWith("0x")) {
      // Check if token exists at this address
      try {
        const token = new hre.ethers.Contract(existingAddr, ERC20_ABI, deployer);
        const symbol = await token.symbol();
        const tokenBalance = await token.balanceOf(deployer.address);
        console.log(`  ${config.symbol}: Using existing at ${existingAddr} (balance: ${hre.ethers.formatEther(tokenBalance)})`);
        tokens[config.symbol] = { address: existingAddr, isStable: config.isStable };
        continue;
      } catch (e) {
        console.log(`  ${config.symbol}: Existing address invalid, deploying new...`);
      }
    }

    console.log(`  Deploying ${config.symbol}...`);
    try {
      const SELToken = await hre.ethers.getContractFactory("SELToken");
      const token = await SELToken.deploy(config.name, config.symbol);
      await token.waitForDeployment();
      const addr = await token.getAddress();
      
      // Mint initial supply
      const mintTx = await token.mint(deployer.address, INITIAL_SUPPLY);
      await mintTx.wait();
      
      console.log(`  ✓ ${config.symbol} deployed: ${addr}`);
      tokens[config.symbol] = { address: addr, isStable: config.isStable };
    } catch (error) {
      console.error(`  ✗ ${config.symbol} deployment failed:`, error.message);
      testResults.failed.push({ name: `Deploy ${config.symbol}`, message: error.message });
    }
  }

  console.log("\n  Token Addresses:");
  Object.entries(tokens).forEach(([symbol, data]) => {
    console.log(`    ${symbol}: ${data.address}`);
  });

  // ═══════════════════════════════════════════════════════════════════
  // STEP 2: DEPLOY DEX CONTRACTS
  // ═══════════════════════════════════════════════════════════════════
  console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("STEP 2: DEPLOYING DEX CONTRACTS");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

  const contracts = {};

  // Check if PoolManager already exists
  let poolManagerAddress = process.env.SELENDRA_POOL_MANAGER_ADDRESS;
  let needsDeployment = true;

  if (poolManagerAddress) {
    try {
      const pm = await hre.ethers.getContractAt("PoolManager", poolManagerAddress);
      await pm.protocolFeeController(); // Test a view function
      console.log(`  PoolManager: Using existing at ${poolManagerAddress}`);
      contracts.PoolManager = poolManagerAddress;
      needsDeployment = false;
    } catch (e) {
      console.log(`  PoolManager: Existing address invalid or not accessible`);
      needsDeployment = true;
    }
  }

  if (needsDeployment) {
    // Deploy PoolManager
    console.log("  Deploying PoolManager...");
    try {
      const PoolManager = await hre.ethers.getContractFactory("PoolManager");
      const pm = await PoolManager.deploy(deployer.address);
      await pm.waitForDeployment();
      contracts.PoolManager = await pm.getAddress();
      console.log(`  ✓ PoolManager: ${contracts.PoolManager}`);
    } catch (error) {
      console.error(`  ✗ PoolManager failed: ${error.message}`);
      process.exit(1);
    }
  }

  // Deploy StateView
  let stateViewAddress = process.env.SELENDRA_STATE_VIEW_ADDRESS;
  if (stateViewAddress && !needsDeployment) {
    try {
      await hre.ethers.getContractAt("StateView", stateViewAddress);
      console.log(`  StateView: Using existing at ${stateViewAddress}`);
      contracts.StateView = stateViewAddress;
    } catch (e) {
      stateViewAddress = null;
    }
  }
  
  if (!stateViewAddress || needsDeployment) {
    console.log("  Deploying StateView...");
    try {
      const StateView = await hre.ethers.getContractFactory("StateView");
      const sv = await StateView.deploy(contracts.PoolManager);
      await sv.waitForDeployment();
      contracts.StateView = await sv.getAddress();
      console.log(`  ✓ StateView: ${contracts.StateView}`);
    } catch (error) {
      console.error(`  ✗ StateView failed: ${error.message}`);
    }
  }

  // Deploy LiquidityManager
  let lmAddress = process.env.SELENDRA_LIQUIDITY_MANAGER_ADDRESS;
  if (lmAddress && !needsDeployment) {
    try {
      const lm = await hre.ethers.getContractAt("LiquidityManager", lmAddress);
      const pmAddr = await lm.poolManager();
      if (pmAddr.toLowerCase() === contracts.PoolManager.toLowerCase()) {
        console.log(`  LiquidityManager: Using existing at ${lmAddress}`);
        contracts.LiquidityManager = lmAddress;
      } else {
        lmAddress = null;
      }
    } catch (e) {
      lmAddress = null;
    }
  }
  
  if (!lmAddress || needsDeployment) {
    console.log("  Deploying LiquidityManager...");
    try {
      const LiquidityManager = await hre.ethers.getContractFactory("LiquidityManager");
      const lm = await LiquidityManager.deploy(contracts.PoolManager);
      await lm.waitForDeployment();
      contracts.LiquidityManager = await lm.getAddress();
      console.log(`  ✓ LiquidityManager: ${contracts.LiquidityManager}`);
    } catch (error) {
      console.error(`  ✗ LiquidityManager failed: ${error.message}`);
    }
  }

  // Deploy SwapRouter
  let srAddress = process.env.SELENDRA_SWAP_ROUTER_ADDRESS;
  if (srAddress && !needsDeployment) {
    try {
      const sr = await hre.ethers.getContractAt("SwapRouter", srAddress);
      const pmAddr = await sr.poolManager();
      if (pmAddr.toLowerCase() === contracts.PoolManager.toLowerCase()) {
        console.log(`  SwapRouter: Using existing at ${srAddress}`);
        contracts.SwapRouter = srAddress;
      } else {
        srAddress = null;
      }
    } catch (e) {
      srAddress = null;
    }
  }
  
  if (!srAddress || needsDeployment) {
    console.log("  Deploying SwapRouter...");
    try {
      const SwapRouter = await hre.ethers.getContractFactory("SwapRouter");
      const sr = await SwapRouter.deploy(contracts.PoolManager);
      await sr.waitForDeployment();
      contracts.SwapRouter = await sr.getAddress();
      console.log(`  ✓ SwapRouter: ${contracts.SwapRouter}`);
    } catch (error) {
      console.error(`  ✗ SwapRouter failed: ${error.message}`);
    }
  }

  // ═══════════════════════════════════════════════════════════════════
  // STEP 3: DEPLOY PRICE ORACLE
  // ═══════════════════════════════════════════════════════════════════
  console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("STEP 3: DEPLOYING PRICE ORACLE");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

  console.log("  Deploying PriceOracle...");
  try {
    const PriceOracle = await hre.ethers.getContractFactory("PriceOracle");
    const oracle = await PriceOracle.deploy(contracts.PoolManager);
    await oracle.waitForDeployment();
    contracts.PriceOracle = await oracle.getAddress();
    console.log(`  ✓ PriceOracle: ${contracts.PriceOracle}`);
    await logTest("Deploy PriceOracle", true);
  } catch (error) {
    console.error(`  ✗ PriceOracle failed: ${error.message}`);
    await logTest("Deploy PriceOracle", false, error.message);
  }

  // ═══════════════════════════════════════════════════════════════════
  // STEP 4: CONFIGURE ORACLE - SET STABLECOINS
  // ═══════════════════════════════════════════════════════════════════
  console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("STEP 4: CONFIGURE ORACLE - SET STABLECOINS & FEED PRICES");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

  if (contracts.PriceOracle) {
    const oracle = await hre.ethers.getContractAt("PriceOracle", contracts.PriceOracle);
    
    // Set TUSD as stablecoin
    if (tokens.TUSD) {
      try {
        console.log("  Setting TUSD as stablecoin...");
        const tx = await oracle.setStablecoin(tokens.TUSD.address, true);
        await tx.wait();
        
        const isStable = await oracle.stablecoins(tokens.TUSD.address);
        await logTest("Set TUSD as stablecoin", isStable);
      } catch (error) {
        await logTest("Set TUSD as stablecoin", false, error.message);
      }
    }

    // Feed external prices for stablecoin pairs
    const priceFeeds = [
      { token0: "TUSD", token1: "TBROWN", price: hre.ethers.parseEther("10") }, // 1 TBROWN = 10 TUSD
      { token0: "TUSD", token1: "TSMART", price: hre.ethers.parseEther("5") },  // 1 TSMART = 5 TUSD
      { token0: "TUSD", token1: "TZANDO", price: hre.ethers.parseEther("2") },  // 1 TZANDO = 2 TUSD
    ];

    for (const feed of priceFeeds) {
      if (tokens[feed.token0] && tokens[feed.token1]) {
        try {
          console.log(`  Feeding price: ${feed.token0}/${feed.token1}...`);
          const tx = await oracle.feedPrice(
            tokens[feed.token0].address,
            tokens[feed.token1].address,
            feed.price
          );
          await tx.wait();
          await logTest(`Feed price ${feed.token0}/${feed.token1}`, true);
        } catch (error) {
          await logTest(`Feed price ${feed.token0}/${feed.token1}`, false, error.message);
        }
      }
    }

    // Test getPrice function
    console.log("\n  Testing Oracle getPrice function...");
    if (tokens.TUSD && tokens.TBROWN) {
      try {
        const priceInfo = await oracle.getPrice(tokens.TUSD.address, tokens.TBROWN.address);
        console.log(`    TUSD/TBROWN Price: ${hre.ethers.formatEther(priceInfo.price)}`);
        console.log(`    TWAP: ${hre.ethers.formatEther(priceInfo.twap)}`);
        console.log(`    From Pool: ${priceInfo.fromPool}`);
        console.log(`    Is Stale: ${priceInfo.isStale}`);
        await logTest("Oracle getPrice TUSD/TBROWN", priceInfo.price > 0n);
      } catch (error) {
        await logTest("Oracle getPrice TUSD/TBROWN", false, error.message);
      }
    }
  }

  // ═══════════════════════════════════════════════════════════════════
  // STEP 5: INITIALIZE POOLS
  // ═══════════════════════════════════════════════════════════════════
  console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("STEP 5: INITIALIZING POOLS");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

  const liquidityManager = await hre.ethers.getContractAt("LiquidityManager", contracts.LiquidityManager);
  
  const poolPairs = [
    { name: "TUSD/TBROWN", tokens: ["TUSD", "TBROWN"] },
    { name: "TUSD/TSMART", tokens: ["TUSD", "TSMART"] },
    { name: "TUSD/TZANDO", tokens: ["TUSD", "TZANDO"] },
    { name: "TBROWN/TSMART", tokens: ["TBROWN", "TSMART"] }
  ];

  for (const pair of poolPairs) {
    if (!tokens[pair.tokens[0]] || !tokens[pair.tokens[1]]) {
      console.log(`  Skipping ${pair.name} - tokens not available`);
      continue;
    }

    const poolKey = createPoolKey(tokens[pair.tokens[0]].address, tokens[pair.tokens[1]].address);
    
    try {
      // Check if pool already initialized
      const isInitialized = await liquidityManager.isPoolInitialized(poolKey);
      
      if (isInitialized) {
        console.log(`  ${pair.name}: Already initialized`);
        await logTest(`Init Pool ${pair.name}`, true);
      } else {
        console.log(`  Initializing ${pair.name}...`);
        const tx = await liquidityManager.initializePool(poolKey, SQRT_PRICE_1_1);
        await tx.wait();
        console.log(`  ✓ ${pair.name} initialized`);
        await logTest(`Init Pool ${pair.name}`, true);
      }
    } catch (error) {
      if (error.message.includes("already initialized") || error.message.includes("PoolAlreadyInitialized")) {
        console.log(`  ${pair.name}: Already initialized (via PoolManager)`);
        await logTest(`Init Pool ${pair.name}`, true);
      } else {
        console.error(`  ✗ ${pair.name} failed: ${error.message}`);
        await logTest(`Init Pool ${pair.name}`, false, error.message);
      }
    }
  }

  // ═══════════════════════════════════════════════════════════════════
  // STEP 6: ADD LIQUIDITY
  // ═══════════════════════════════════════════════════════════════════
  console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("STEP 6: ADDING LIQUIDITY");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

  const LIQUIDITY_AMOUNT = hre.ethers.parseEther("1000");
  const { tickLower, tickUpper } = getFullRangeTicks(TICK_SPACING);

  for (const pair of poolPairs) {
    if (!tokens[pair.tokens[0]] || !tokens[pair.tokens[1]]) continue;

    const token0Addr = tokens[pair.tokens[0]].address;
    const token1Addr = tokens[pair.tokens[1]].address;
    const poolKey = createPoolKey(token0Addr, token1Addr);
    
    try {
      console.log(`  Adding liquidity to ${pair.name}...`);
      
      // Get token contracts
      const token0 = new hre.ethers.Contract(token0Addr, ERC20_ABI, deployer);
      const token1 = new hre.ethers.Contract(token1Addr, ERC20_ABI, deployer);
      
      // Check balances
      const balance0 = await token0.balanceOf(deployer.address);
      const balance1 = await token1.balanceOf(deployer.address);
      
      if (balance0 < LIQUIDITY_AMOUNT || balance1 < LIQUIDITY_AMOUNT) {
        console.log(`    Insufficient balance for ${pair.name}`);
        await logTest(`Add Liquidity ${pair.name}`, false, "Insufficient balance");
        continue;
      }

      // Transfer tokens to LiquidityManager
      console.log(`    Transferring tokens to LiquidityManager...`);
      let tx = await token0.transfer(contracts.LiquidityManager, LIQUIDITY_AMOUNT);
      await tx.wait();
      tx = await token1.transfer(contracts.LiquidityManager, LIQUIDITY_AMOUNT);
      await tx.wait();
      
      // Add liquidity
      console.log(`    Adding liquidity...`);
      tx = await liquidityManager.addLiquidity(
        poolKey,
        tickLower,
        tickUpper,
        LIQUIDITY_AMOUNT // Using token amount as liquidity delta
      );
      const receipt = await tx.wait();
      
      console.log(`  ✓ Liquidity added to ${pair.name} (gas: ${receipt.gasUsed})`);
      await logTest(`Add Liquidity ${pair.name}`, true);
      
    } catch (error) {
      console.error(`  ✗ ${pair.name} liquidity failed: ${error.message}`);
      await logTest(`Add Liquidity ${pair.name}`, false, error.message);
    }
  }

  // ═══════════════════════════════════════════════════════════════════
  // STEP 7: TEST SWAPS
  // ═══════════════════════════════════════════════════════════════════
  console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("STEP 7: TESTING SWAPS");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

  const swapRouter = await hre.ethers.getContractAt("SwapRouter", contracts.SwapRouter);
  const SWAP_AMOUNT = hre.ethers.parseEther("10");
  
  // Price limits
  const MIN_SQRT_RATIO = 4295128740n;
  const MAX_SQRT_RATIO = 1461446703485210103287273052203988822378723970342n;

  if (tokens.TUSD && tokens.TBROWN) {
    const poolKey = createPoolKey(tokens.TUSD.address, tokens.TBROWN.address);
    const [sortedToken0] = sortTokens(tokens.TUSD.address, tokens.TBROWN.address);
    const zeroForOne = sortedToken0.toLowerCase() === tokens.TUSD.address.toLowerCase();
    
    try {
      console.log(`  Swapping TUSD -> TBROWN...`);
      
      const tusd = new hre.ethers.Contract(tokens.TUSD.address, ERC20_ABI, deployer);
      const tbrown = new hre.ethers.Contract(tokens.TBROWN.address, ERC20_ABI, deployer);
      
      // Get balances before
      const tusdBefore = await tusd.balanceOf(deployer.address);
      const tbrownBefore = await tbrown.balanceOf(deployer.address);
      
      // Approve tokens for swap router
      console.log(`    Approving TUSD for SwapRouter...`);
      let tx = await tusd.approve(contracts.SwapRouter, SWAP_AMOUNT);
      await tx.wait();
      
      // Execute swap
      const swapParams = {
        zeroForOne: zeroForOne,
        amountSpecified: -SWAP_AMOUNT, // Negative = exact input
        sqrtPriceLimitX96: zeroForOne ? MIN_SQRT_RATIO + 1n : MAX_SQRT_RATIO - 1n
      };
      
      console.log(`    Executing swap...`);
      tx = await swapRouter.swap(poolKey, swapParams);
      const receipt = await tx.wait();
      
      // Get balances after
      const tusdAfter = await tusd.balanceOf(deployer.address);
      const tbrownAfter = await tbrown.balanceOf(deployer.address);
      
      console.log(`    TUSD: ${hre.ethers.formatEther(tusdBefore)} -> ${hre.ethers.formatEther(tusdAfter)}`);
      console.log(`    TBROWN: ${hre.ethers.formatEther(tbrownBefore)} -> ${hre.ethers.formatEther(tbrownAfter)}`);
      console.log(`  ✓ Swap completed (gas: ${receipt.gasUsed})`);
      
      await logTest("Swap TUSD -> TBROWN", tusdAfter < tusdBefore || tbrownAfter > tbrownBefore);
      
    } catch (error) {
      console.error(`  ✗ Swap TUSD -> TBROWN failed: ${error.message}`);
      await logTest("Swap TUSD -> TBROWN", false, error.message);
    }
  }

  // ═══════════════════════════════════════════════════════════════════
  // STEP 8: TEST ORACLE AFTER POOL
  // ═══════════════════════════════════════════════════════════════════
  console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("STEP 8: TESTING ORACLE WITH POOL DATA");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

  if (contracts.PriceOracle && tokens.TUSD && tokens.TBROWN) {
    const oracle = await hre.ethers.getContractAt("PriceOracle", contracts.PriceOracle);
    
    try {
      // Get pool price
      console.log("  Getting pool price TUSD/TBROWN...");
      const [poolPrice, sqrtPriceX96] = await oracle.getPoolPrice(tokens.TUSD.address, tokens.TBROWN.address);
      console.log(`    Pool Price: ${hre.ethers.formatEther(poolPrice)}`);
      console.log(`    sqrtPriceX96: ${sqrtPriceX96.toString()}`);
      await logTest("Oracle getPoolPrice", poolPrice > 0n);
    } catch (error) {
      console.log(`    Pool price not available (expected if pool uses different fee/tickSpacing)`);
      await logTest("Oracle getPoolPrice", false, error.message);
    }

    try {
      // Observe pool price for TWAP
      console.log("  Observing pool price...");
      const tx = await oracle.observePoolPrice(tokens.TUSD.address, tokens.TBROWN.address);
      await tx.wait();
      await logTest("Oracle observePoolPrice", true);
    } catch (error) {
      await logTest("Oracle observePoolPrice", false, error.message);
    }

    try {
      // Get external price
      console.log("  Getting external price...");
      const extPrice = await oracle.getExternalPrice(tokens.TUSD.address, tokens.TBROWN.address);
      console.log(`    External Price: ${hre.ethers.formatEther(extPrice.price)}`);
      console.log(`    Is Valid: ${extPrice.isValid}`);
      await logTest("Oracle getExternalPrice", extPrice.price > 0n && extPrice.isValid);
    } catch (error) {
      await logTest("Oracle getExternalPrice", false, error.message);
    }
  }

  // ═══════════════════════════════════════════════════════════════════
  // STEP 9: TEST REMOVE LIQUIDITY & COLLECT FEES
  // ═══════════════════════════════════════════════════════════════════
  console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("STEP 9: TESTING REMOVE LIQUIDITY & COLLECT FEES");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

  if (tokens.TUSD && tokens.TBROWN) {
    const poolKey = createPoolKey(tokens.TUSD.address, tokens.TBROWN.address);
    
    // Test collect fees
    try {
      console.log("  Collecting fees from TUSD/TBROWN...");
      const tx = await liquidityManager.collectFees(poolKey, tickLower, tickUpper);
      const receipt = await tx.wait();
      console.log(`  ✓ Fees collected (gas: ${receipt.gasUsed})`);
      await logTest("Collect Fees TUSD/TBROWN", true);
    } catch (error) {
      console.log(`  ✗ Collect fees failed: ${error.message}`);
      await logTest("Collect Fees TUSD/TBROWN", false, error.message);
    }

    // Test remove liquidity (small amount)
    const REMOVE_AMOUNT = hre.ethers.parseEther("100");
    try {
      console.log("  Removing liquidity from TUSD/TBROWN...");
      
      const tusd = new hre.ethers.Contract(tokens.TUSD.address, ERC20_ABI, deployer);
      const tbrown = new hre.ethers.Contract(tokens.TBROWN.address, ERC20_ABI, deployer);
      
      const tusdBefore = await tusd.balanceOf(deployer.address);
      const tbrownBefore = await tbrown.balanceOf(deployer.address);
      
      const tx = await liquidityManager.removeLiquidity(poolKey, tickLower, tickUpper, REMOVE_AMOUNT);
      const receipt = await tx.wait();
      
      const tusdAfter = await tusd.balanceOf(deployer.address);
      const tbrownAfter = await tbrown.balanceOf(deployer.address);
      
      console.log(`    TUSD received: ${hre.ethers.formatEther(tusdAfter - tusdBefore)}`);
      console.log(`    TBROWN received: ${hre.ethers.formatEther(tbrownAfter - tbrownBefore)}`);
      console.log(`  ✓ Liquidity removed (gas: ${receipt.gasUsed})`);
      await logTest("Remove Liquidity TUSD/TBROWN", true);
    } catch (error) {
      console.log(`  ✗ Remove liquidity failed: ${error.message}`);
      await logTest("Remove Liquidity TUSD/TBROWN", false, error.message);
    }
  }

  // ═══════════════════════════════════════════════════════════════════
  // FINAL SUMMARY
  // ═══════════════════════════════════════════════════════════════════
  console.log("\n═══════════════════════════════════════════════════════════════════");
  console.log("                        TEST SUMMARY");
  console.log("═══════════════════════════════════════════════════════════════════\n");

  console.log("DEPLOYED CONTRACTS:");
  Object.entries(contracts).forEach(([name, addr]) => {
    console.log(`  ${name.padEnd(20)}: ${addr}`);
  });

  console.log("\nDEPLOYED TOKENS:");
  Object.entries(tokens).forEach(([symbol, data]) => {
    console.log(`  ${symbol.padEnd(10)}: ${data.address} ${data.isStable ? "(stablecoin)" : ""}`);
  });

  console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log(`TESTS PASSED: ${testResults.passed.length}`);
  testResults.passed.forEach(name => console.log(`  ✅ ${name}`));
  
  console.log(`\nTESTS FAILED: ${testResults.failed.length}`);
  testResults.failed.forEach(({ name, message }) => console.log(`  ❌ ${name}: ${message}`));
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

  // Update .env with new addresses
  console.log("\n--- Update .env with these addresses ---");
  console.log("# Selendra DEX Contract Addresses");
  Object.entries(contracts).forEach(([name, addr]) => {
    const envKey = `SELENDRA_${name.replace(/([A-Z])/g, '_$1').toUpperCase()}_ADDRESS`.replace('__', '_');
    console.log(`${envKey}=${addr}`);
  });
  console.log("\n# Selendra Token Addresses");
  Object.entries(tokens).forEach(([symbol, data]) => {
    console.log(`SELENDRA_${symbol}_ADDRESS=${data.address}`);
  });

  return { contracts, tokens, testResults };
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
