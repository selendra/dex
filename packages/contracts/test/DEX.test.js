const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("DEX - Full Integration Tests", function () {
  let poolManager, stateView, liquidityManager, swapRouter;
  let tokenS, tokenA, tokenB, tokenC;
  let tokenSAddr, tokenAAddr, tokenBAddr, tokenCAddr;
  let owner;
  
  const SQRT_PRICE_1_1 = "79228162514264337593543950336";
  const MIN_TICK = -887220;
  const MAX_TICK = 887220;
  const FEE_MEDIUM = 3000;
  const TICK_SPACING_MEDIUM = 60;

  beforeEach(async function () {
    [owner] = await ethers.getSigners();
    
    const PoolManager = await ethers.getContractFactory("PoolManager");
    poolManager = await PoolManager.deploy(owner.address);
    
    const StateView = await ethers.getContractFactory("StateView");
    stateView = await StateView.deploy(await poolManager.getAddress());
    
    const SimpleLiquidityManager = await ethers.getContractFactory("SimpleLiquidityManager");
    liquidityManager = await SimpleLiquidityManager.deploy(await poolManager.getAddress());
    
    const WorkingSwapRouter = await ethers.getContractFactory("WorkingSwapRouter");
    swapRouter = await WorkingSwapRouter.deploy(await poolManager.getAddress());
    
    const TestToken = await ethers.getContractFactory("TestToken");
    tokenS = await TestToken.deploy("Token Stable", "TOKENS");
    tokenA = await TestToken.deploy("Token A", "TOKENA");
    tokenB = await TestToken.deploy("Token B", "TOKENB");
    tokenC = await TestToken.deploy("Token C", "TOKENC");

    tokenSAddr = await tokenS.getAddress();
    tokenAAddr = await tokenA.getAddress();
    tokenBAddr = await tokenB.getAddress();
    tokenCAddr = await tokenC.getAddress();

    // Initialize all pools
    const [c0_SA, c1_SA] = tokenSAddr.toLowerCase() < tokenAAddr.toLowerCase() ? [tokenSAddr, tokenAAddr] : [tokenAAddr, tokenSAddr];
    await poolManager.initialize({
      currency0: c0_SA, currency1: c1_SA,
      fee: FEE_MEDIUM, tickSpacing: TICK_SPACING_MEDIUM,
      hooks: ethers.ZeroAddress
    }, SQRT_PRICE_1_1);

    const [c0_SB, c1_SB] = tokenSAddr.toLowerCase() < tokenBAddr.toLowerCase() ? [tokenSAddr, tokenBAddr] : [tokenBAddr, tokenSAddr];
    await poolManager.initialize({
      currency0: c0_SB, currency1: c1_SB,
      fee: FEE_MEDIUM, tickSpacing: TICK_SPACING_MEDIUM,
      hooks: ethers.ZeroAddress
    }, SQRT_PRICE_1_1);

    const [c0_SC, c1_SC] = tokenSAddr.toLowerCase() < tokenCAddr.toLowerCase() ? [tokenSAddr, tokenCAddr] : [tokenCAddr, tokenSAddr];
    await poolManager.initialize({
      currency0: c0_SC, currency1: c1_SC,
      fee: FEE_MEDIUM, tickSpacing: TICK_SPACING_MEDIUM,
      hooks: ethers.ZeroAddress
    }, SQRT_PRICE_1_1);

    const [c0_AB, c1_AB] = tokenAAddr.toLowerCase() < tokenBAddr.toLowerCase() ? [tokenAAddr, tokenBAddr] : [tokenBAddr, tokenAAddr];
    await poolManager.initialize({
      currency0: c0_AB, currency1: c1_AB,
      fee: FEE_MEDIUM, tickSpacing: TICK_SPACING_MEDIUM,
      hooks: ethers.ZeroAddress
    }, SQRT_PRICE_1_1);

    // Add liquidity to all pools
    const lmAddr = await liquidityManager.getAddress();
    
    await tokenS.transfer(lmAddr, ethers.parseEther("20000"));
    await tokenA.transfer(lmAddr, ethers.parseEther("20000"));
    await liquidityManager.addLiquidity({
      currency0: c0_SA, currency1: c1_SA,
      fee: FEE_MEDIUM, tickSpacing: TICK_SPACING_MEDIUM,
      hooks: ethers.ZeroAddress
    }, MIN_TICK, MAX_TICK, ethers.parseEther("1000"));

    await tokenS.transfer(lmAddr, ethers.parseEther("20000"));
    await tokenB.transfer(lmAddr, ethers.parseEther("20000"));
    await liquidityManager.addLiquidity({
      currency0: c0_SB, currency1: c1_SB,
      fee: FEE_MEDIUM, tickSpacing: TICK_SPACING_MEDIUM,
      hooks: ethers.ZeroAddress
    }, MIN_TICK, MAX_TICK, ethers.parseEther("1000"));

    await tokenS.transfer(lmAddr, ethers.parseEther("20000"));
    await tokenC.transfer(lmAddr, ethers.parseEther("20000"));
    await liquidityManager.addLiquidity({
      currency0: c0_SC, currency1: c1_SC,
      fee: FEE_MEDIUM, tickSpacing: TICK_SPACING_MEDIUM,
      hooks: ethers.ZeroAddress
    }, MIN_TICK, MAX_TICK, ethers.parseEther("1000"));

    await tokenA.transfer(lmAddr, ethers.parseEther("20000"));
    await tokenB.transfer(lmAddr, ethers.parseEther("20000"));
    await liquidityManager.addLiquidity({
      currency0: c0_AB, currency1: c1_AB,
      fee: FEE_MEDIUM, tickSpacing: TICK_SPACING_MEDIUM,
      hooks: ethers.ZeroAddress
    }, MIN_TICK, MAX_TICK, ethers.parseEther("1000"));
  });

  describe("Architecture Verification", function () {
    it("Should have 4 pools initialized with liquidity", async function () {
      // Check TokenS-TokenA pool
      const [c0_SA, c1_SA] = tokenSAddr.toLowerCase() < tokenAAddr.toLowerCase() ? [tokenSAddr, tokenAAddr] : [tokenAAddr, tokenSAddr];
      const poolId_SA = ethers.keccak256(ethers.AbiCoder.defaultAbiCoder().encode(
        ["address", "address", "uint24", "int24", "address"],
        [c0_SA, c1_SA, FEE_MEDIUM, TICK_SPACING_MEDIUM, ethers.ZeroAddress]
      ));
      const liquidity_SA = await stateView.getLiquidity(poolId_SA);
      expect(liquidity_SA).to.be.gt(0);

      // Check TokenS-TokenB pool
      const [c0_SB, c1_SB] = tokenSAddr.toLowerCase() < tokenBAddr.toLowerCase() ? [tokenSAddr, tokenBAddr] : [tokenBAddr, tokenSAddr];
      const poolId_SB = ethers.keccak256(ethers.AbiCoder.defaultAbiCoder().encode(
        ["address", "address", "uint24", "int24", "address"],
        [c0_SB, c1_SB, FEE_MEDIUM, TICK_SPACING_MEDIUM, ethers.ZeroAddress]
      ));
      const liquidity_SB = await stateView.getLiquidity(poolId_SB);
      expect(liquidity_SB).to.be.gt(0);

      // Check TokenS-TokenC pool
      const [c0_SC, c1_SC] = tokenSAddr.toLowerCase() < tokenCAddr.toLowerCase() ? [tokenSAddr, tokenCAddr] : [tokenCAddr, tokenSAddr];
      const poolId_SC = ethers.keccak256(ethers.AbiCoder.defaultAbiCoder().encode(
        ["address", "address", "uint24", "int24", "address"],
        [c0_SC, c1_SC, FEE_MEDIUM, TICK_SPACING_MEDIUM, ethers.ZeroAddress]
      ));
      const liquidity_SC = await stateView.getLiquidity(poolId_SC);
      expect(liquidity_SC).to.be.gt(0);

      // Check TokenA-TokenB pool
      const [c0_AB, c1_AB] = tokenAAddr.toLowerCase() < tokenBAddr.toLowerCase() ? [tokenAAddr, tokenBAddr] : [tokenBAddr, tokenAAddr];
      const poolId_AB = ethers.keccak256(ethers.AbiCoder.defaultAbiCoder().encode(
        ["address", "address", "uint24", "int24", "address"],
        [c0_AB, c1_AB, FEE_MEDIUM, TICK_SPACING_MEDIUM, ethers.ZeroAddress]
      ));
      const liquidity_AB = await stateView.getLiquidity(poolId_AB);
      expect(liquidity_AB).to.be.gt(0);

      console.log("✓ Single PoolManager managing 4 pools with liquidity");
    });
  });

  describe("Basic Swaps", function () {
    it("Should swap TokenS for TokenB", async function () {
      const [c0, c1] = tokenSAddr.toLowerCase() < tokenBAddr.toLowerCase() ? [tokenSAddr, tokenBAddr] : [tokenBAddr, tokenSAddr];
      const swapAmount = ethers.parseEther("100");
      
      await tokenS.approve(await swapRouter.getAddress(), swapAmount);
      const balBefore = await tokenB.balanceOf(owner.address);

      await swapRouter.swap({
        currency0: c0, currency1: c1, fee: FEE_MEDIUM, tickSpacing: TICK_SPACING_MEDIUM, hooks: ethers.ZeroAddress
      }, {
        zeroForOne: tokenSAddr.toLowerCase() < tokenBAddr.toLowerCase(),
        amountSpecified: -swapAmount,
        sqrtPriceLimitX96: tokenSAddr.toLowerCase() < tokenBAddr.toLowerCase() ? "4295128740" : "1461446703485210103287273052203988822378723970342"
      });

      expect(await tokenB.balanceOf(owner.address)).to.be.gt(balBefore);
    });


    it("Should swap TokenA for TokenB", async function () {
      const [c0, c1] = tokenAAddr.toLowerCase() < tokenBAddr.toLowerCase() ? [tokenAAddr, tokenBAddr] : [tokenBAddr, tokenAAddr];
      const swapAmount = ethers.parseEther("100");
      
      await tokenA.approve(await swapRouter.getAddress(), swapAmount);
      const balBefore = await tokenB.balanceOf(owner.address);

      await swapRouter.swap({
        currency0: c0, currency1: c1, fee: FEE_MEDIUM, tickSpacing: TICK_SPACING_MEDIUM, hooks: ethers.ZeroAddress
      }, {
        zeroForOne: tokenAAddr.toLowerCase() < tokenBAddr.toLowerCase(),
        amountSpecified: -swapAmount,
        sqrtPriceLimitX96: tokenAAddr.toLowerCase() < tokenBAddr.toLowerCase() ? "4295128740" : "1461446703485210103287273052203988822378723970342"
      });

      expect(await tokenB.balanceOf(owner.address)).to.be.gt(balBefore);
    });
  });

  describe("Liquidity Management", function () {
    it("Should add additional liquidity to pool", async function () {
      const [c0, c1] = tokenSAddr.toLowerCase() < tokenBAddr.toLowerCase() ? [tokenSAddr, tokenBAddr] : [tokenBAddr, tokenSAddr];
      const poolId = ethers.keccak256(ethers.AbiCoder.defaultAbiCoder().encode(
        ["address", "address", "uint24", "int24", "address"],
        [c0, c1, FEE_MEDIUM, TICK_SPACING_MEDIUM, ethers.ZeroAddress]
      ));

      const liquidityBefore = await stateView.getLiquidity(poolId);

      const lmAddr = await liquidityManager.getAddress();
      await tokenS.transfer(lmAddr, ethers.parseEther("5000"));
      await tokenB.transfer(lmAddr, ethers.parseEther("5000"));
      await liquidityManager.addLiquidity({
        currency0: c0, currency1: c1, fee: FEE_MEDIUM, tickSpacing: TICK_SPACING_MEDIUM, hooks: ethers.ZeroAddress
      }, MIN_TICK, MAX_TICK, ethers.parseEther("500"));

      const liquidityAfter = await stateView.getLiquidity(poolId);
      expect(liquidityAfter).to.be.gt(liquidityBefore);
    });

    it("Should remove liquidity from pool", async function () {
      const [c0, c1] = tokenSAddr.toLowerCase() < tokenCAddr.toLowerCase() ? [tokenSAddr, tokenCAddr] : [tokenCAddr, tokenSAddr];
      const poolId = ethers.keccak256(ethers.AbiCoder.defaultAbiCoder().encode(
        ["address", "address", "uint24", "int24", "address"],
        [c0, c1, FEE_MEDIUM, TICK_SPACING_MEDIUM, ethers.ZeroAddress]
      ));

      const liquidityBefore = await stateView.getLiquidity(poolId);

      await liquidityManager.addLiquidity({
        currency0: c0, currency1: c1, fee: FEE_MEDIUM, tickSpacing: TICK_SPACING_MEDIUM, hooks: ethers.ZeroAddress
      }, MIN_TICK, MAX_TICK, ethers.parseEther("-400"));

      const liquidityAfter = await stateView.getLiquidity(poolId);
      expect(liquidityAfter).to.be.lt(liquidityBefore);
    });

    it("Should remove and re-add liquidity", async function () {
      const [c0, c1] = tokenAAddr.toLowerCase() < tokenBAddr.toLowerCase() ? [tokenAAddr, tokenBAddr] : [tokenBAddr, tokenAAddr];
      const poolId = ethers.keccak256(ethers.AbiCoder.defaultAbiCoder().encode(
        ["address", "address", "uint24", "int24", "address"],
        [c0, c1, FEE_MEDIUM, TICK_SPACING_MEDIUM, ethers.ZeroAddress]
      ));

      const liquidityStart = await stateView.getLiquidity(poolId);

      // Remove liquidity
      await liquidityManager.addLiquidity({
        currency0: c0, currency1: c1, fee: FEE_MEDIUM, tickSpacing: TICK_SPACING_MEDIUM, hooks: ethers.ZeroAddress
      }, MIN_TICK, MAX_TICK, ethers.parseEther("-300"));
      
      const liquidityAfterRemove = await stateView.getLiquidity(poolId);
      expect(liquidityAfterRemove).to.be.lt(liquidityStart);

      // Add back
      const lmAddr = await liquidityManager.getAddress();
      await tokenA.transfer(lmAddr, ethers.parseEther("5000"));
      await tokenB.transfer(lmAddr, ethers.parseEther("5000"));
      await liquidityManager.addLiquidity({
        currency0: c0, currency1: c1, fee: FEE_MEDIUM, tickSpacing: TICK_SPACING_MEDIUM, hooks: ethers.ZeroAddress
      }, MIN_TICK, MAX_TICK, ethers.parseEther("300"));

      const liquidityAfterAdd = await stateView.getLiquidity(poolId);
      expect(liquidityAfterAdd).to.be.gt(liquidityAfterRemove);
    });
  });

  describe("State Queries", function () {
    it("Should query pool slot0 data", async function () {
      const [c0, c1] = tokenSAddr.toLowerCase() < tokenBAddr.toLowerCase() ? [tokenSAddr, tokenBAddr] : [tokenBAddr, tokenSAddr];
      const poolId = ethers.keccak256(ethers.AbiCoder.defaultAbiCoder().encode(
        ["address", "address", "uint24", "int24", "address"],
        [c0, c1, FEE_MEDIUM, TICK_SPACING_MEDIUM, ethers.ZeroAddress]
      ));

      const slot0 = await stateView.getSlot0(poolId);
      expect(slot0.sqrtPriceX96).to.equal(SQRT_PRICE_1_1);
    });

    it("Should query all pool liquidity values", async function () {
      const pools = [
        [tokenSAddr, tokenAAddr],
        [tokenSAddr, tokenBAddr],
        [tokenSAddr, tokenCAddr],
        [tokenAAddr, tokenBAddr]
      ];

      for (const [addr0, addr1] of pools) {
        const [c0, c1] = addr0.toLowerCase() < addr1.toLowerCase() ? [addr0, addr1] : [addr1, addr0];
        const poolId = ethers.keccak256(ethers.AbiCoder.defaultAbiCoder().encode(
          ["address", "address", "uint24", "int24", "address"],
          [c0, c1, FEE_MEDIUM, TICK_SPACING_MEDIUM, ethers.ZeroAddress]
        ));

        const liquidity = await stateView.getLiquidity(poolId);
        expect(liquidity).to.be.gt(0);
      }
    });
  });
});
