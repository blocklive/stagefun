const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Platform Fee Functionality", function () {
  let factory;
  let poolImplementation;
  let lpTokenImplementation;
  let nftImplementation;
  let usdc;
  let owner;
  let user1;
  let user2;
  let feeRecipient;
  let pool;

  const POOL_NAME = "Fee Test Pool";
  const POOL_UNIQUE_ID = "fee-test-pool";
  const POOL_SYMBOL = "FEE";
  const TARGET_AMOUNT = ethers.parseUnits("1000", 6); // 1000 USDC
  const CAP_AMOUNT = ethers.parseUnits("2000", 6); // 2000 USDC
  const TIER_PRICE = ethers.parseUnits("100", 6); // 100 USDC
  const REVENUE_AMOUNT = ethers.parseUnits("500", 6); // 500 USDC
  const FUNDING_FEE_BPS = 300; // 3% funding fee
  const REVENUE_FEE_BPS = 50; // 0.5% revenue fee

  beforeEach(async function () {
    // Get signers
    [owner, user1, user2, feeRecipient] = await ethers.getSigners();

    // Deploy USDC token (mock for testing)
    const MockUSDC = await ethers.getContractFactory("MockUSDC");
    usdc = await MockUSDC.deploy();
    await usdc.waitForDeployment();

    // Deploy implementation contracts
    const StageDotFunLiquidity = await ethers.getContractFactory(
      "StageDotFunLiquidity"
    );
    lpTokenImplementation = await StageDotFunLiquidity.deploy();
    await lpTokenImplementation.waitForDeployment();

    const StageDotFunNFT = await ethers.getContractFactory("StageDotFunNFT");
    nftImplementation = await StageDotFunNFT.deploy();
    await nftImplementation.waitForDeployment();

    const StageDotFunPool = await ethers.getContractFactory("StageDotFunPool");
    poolImplementation = await StageDotFunPool.deploy();
    await poolImplementation.waitForDeployment();

    // Deploy factory
    const StageDotFunPoolFactory = await ethers.getContractFactory(
      "StageDotFunPoolFactory"
    );
    factory = await StageDotFunPoolFactory.deploy(
      await usdc.getAddress(),
      await poolImplementation.getAddress(),
      await lpTokenImplementation.getAddress(),
      await nftImplementation.getAddress()
    );
    await factory.waitForDeployment();

    // Mint USDC to users for testing
    await usdc.mint(user1.address, ethers.parseUnits("10000", 6)); // 10000 USDC
    await usdc.mint(user2.address, ethers.parseUnits("10000", 6)); // 10000 USDC
    await usdc.mint(owner.address, ethers.parseUnits("10000", 6)); // 10000 USDC for revenue distribution

    // Create a pool with fees enabled
    const endTime = Math.floor(Date.now() / 1000) + 86400; // 24 hours from now
    const tiers = [
      {
        name: "Paid Tier",
        price: TIER_PRICE,
        nftMetadata: "ipfs://paidtier",
        isVariablePrice: false,
        minPrice: 0,
        maxPrice: 0,
        maxPatrons: 50,
      },
    ];

    const tx = await factory.createPool(
      POOL_NAME,
      POOL_UNIQUE_ID,
      POOL_SYMBOL,
      endTime,
      owner.address,
      owner.address,
      TARGET_AMOUNT,
      CAP_AMOUNT,
      tiers,
      feeRecipient.address,
      FUNDING_FEE_BPS,
      REVENUE_FEE_BPS
    );
    const receipt = await tx.wait();
    const event = receipt.logs.find(
      (log) => log.fragment?.name === "PoolCreated"
    );
    const poolAddress = event.args[0];

    // Get pool contract
    pool = await ethers.getContractAt("StageDotFunPool", poolAddress);
  });

  describe("Fee Configuration", function () {
    it("should initialize with correct fee parameters", async function () {
      const actualFeeRecipient = await pool.feeRecipient();
      const actualFundingFeeBps = await pool.fundingFeeBps();
      const actualRevenueFeeBps = await pool.revenueFeeBps();

      expect(actualFeeRecipient).to.equal(feeRecipient.address);
      expect(actualFundingFeeBps).to.equal(FUNDING_FEE_BPS);
      expect(actualRevenueFeeBps).to.equal(REVENUE_FEE_BPS);
    });

    it("should allow owner to update fee recipient", async function () {
      await pool.connect(owner).setFeeRecipient(user2.address);
      expect(await pool.feeRecipient()).to.equal(user2.address);
    });

    it("should allow owner to update fee basis points", async function () {
      const newFundingFeeBps = 500; // 5%
      await pool.connect(owner).setFundingFeeBps(newFundingFeeBps);
      expect(await pool.fundingFeeBps()).to.equal(newFundingFeeBps);

      const newRevenueFeeBps = 100; // 1%
      await pool.connect(owner).setRevenueFeeBps(newRevenueFeeBps);
      expect(await pool.revenueFeeBps()).to.equal(newRevenueFeeBps);
    });

    it("should not allow non-owner to update fee settings", async function () {
      await expect(pool.connect(user1).setFeeRecipient(user2.address)).to.be
        .reverted;
      await expect(pool.connect(user1).setFundingFeeBps(300)).to.be.reverted;
      await expect(pool.connect(user1).setRevenueFeeBps(100)).to.be.reverted;
    });
  });

  describe("Success Fee Collection", function () {
    it("should collect platform fee when reaching target", async function () {
      // Get initial balances
      const initialFeeRecipientBalance = await usdc.balanceOf(
        feeRecipient.address
      );

      // Fund the pool to reach target
      const commitsNeeded = Math.ceil(
        Number(TARGET_AMOUNT) / Number(TIER_PRICE)
      );
      for (let i = 0; i < commitsNeeded; i++) {
        await usdc.connect(user1).approve(await pool.getAddress(), TIER_PRICE);
        await pool.connect(user1).commitToTier(0, TIER_PRICE);
      }

      // Verify pool is funded
      const status = await pool.status();
      expect(status).to.equal(4); // PoolStatus.FUNDED

      // Begin execution to trigger fee collection
      await pool.connect(owner).beginExecution();

      // Check fee was collected
      const expectedFee = (TARGET_AMOUNT * BigInt(FUNDING_FEE_BPS)) / 10000n;
      const finalFeeRecipientBalance = await usdc.balanceOf(
        feeRecipient.address
      );
      const platformFeeAccrued = await pool.platformFeeAccrued();

      expect(finalFeeRecipientBalance).to.equal(
        initialFeeRecipientBalance + expectedFee
      );
      expect(platformFeeAccrued).to.equal(expectedFee);
    });

    it("should collect platform fee when reaching cap", async function () {
      // Get initial balances
      const initialFeeRecipientBalance = await usdc.balanceOf(
        feeRecipient.address
      );

      // Fund the pool to reach cap
      const commitsNeeded = Math.ceil(Number(CAP_AMOUNT) / Number(TIER_PRICE));
      for (let i = 0; i < commitsNeeded; i++) {
        await usdc.connect(user1).approve(await pool.getAddress(), TIER_PRICE);
        await pool.connect(user1).commitToTier(0, TIER_PRICE);
      }

      // Verify pool moved directly to EXECUTING state when cap is reached
      const status = await pool.status();
      expect(status).to.equal(7); // PoolStatus.EXECUTING

      // Check fee was collected
      const expectedFee = (CAP_AMOUNT * BigInt(FUNDING_FEE_BPS)) / 10000n;
      const finalFeeRecipientBalance = await usdc.balanceOf(
        feeRecipient.address
      );
      const platformFeeAccrued = await pool.platformFeeAccrued();

      expect(finalFeeRecipientBalance).to.equal(
        initialFeeRecipientBalance + expectedFee
      );
      expect(platformFeeAccrued).to.equal(expectedFee);
    });
  });

  describe("Revenue Fee Collection", function () {
    it("should collect platform fee on revenue deposits", async function () {
      // Fund the pool to reach target
      const commitsNeeded = Math.ceil(
        Number(TARGET_AMOUNT) / Number(TIER_PRICE)
      );
      for (let i = 0; i < commitsNeeded; i++) {
        await usdc.connect(user1).approve(await pool.getAddress(), TIER_PRICE);
        await pool.connect(user1).commitToTier(0, TIER_PRICE);
      }

      // Move to executing state
      await pool.connect(owner).beginExecution();

      // Get initial balances after success fee collection
      const initialFeeRecipientBalance = await usdc.balanceOf(
        feeRecipient.address
      );
      const initialPlatformFeeAccrued = await pool.platformFeeAccrued();

      // Deposit revenue
      await usdc
        .connect(owner)
        .approve(await pool.getAddress(), REVENUE_AMOUNT);
      await pool.connect(owner).receiveRevenue(REVENUE_AMOUNT);

      // Check revenue fee was collected
      const expectedRevenueFee =
        (REVENUE_AMOUNT * BigInt(REVENUE_FEE_BPS)) / 10000n;
      const finalFeeRecipientBalance = await usdc.balanceOf(
        feeRecipient.address
      );
      const finalPlatformFeeAccrued = await pool.platformFeeAccrued();

      expect(finalFeeRecipientBalance).to.equal(
        initialFeeRecipientBalance + expectedRevenueFee
      );
      expect(finalPlatformFeeAccrued).to.equal(
        initialPlatformFeeAccrued + expectedRevenueFee
      );

      // Check net revenue was recorded correctly
      const netRevenue = REVENUE_AMOUNT - expectedRevenueFee;
      const revenueAccumulated = await pool.revenueAccumulated();
      expect(revenueAccumulated).to.equal(netRevenue);
    });

    it("should not collect fees when fee recipient is address(0)", async function () {
      // Fund the pool to reach target
      const commitsNeeded = Math.ceil(
        Number(TARGET_AMOUNT) / Number(TIER_PRICE)
      );
      for (let i = 0; i < commitsNeeded; i++) {
        await usdc.connect(user1).approve(await pool.getAddress(), TIER_PRICE);
        await pool.connect(user1).commitToTier(0, TIER_PRICE);
      }

      // Move to executing state
      await pool.connect(owner).beginExecution();

      // Set fee recipient to zero address (keeps the fee rates the same)
      await pool.connect(owner).setFeeRecipient(ethers.ZeroAddress);

      // Deposit revenue
      await usdc
        .connect(owner)
        .approve(await pool.getAddress(), REVENUE_AMOUNT);
      await pool.connect(owner).receiveRevenue(REVENUE_AMOUNT);

      // Check revenue is fully recorded with no fee deduction
      const revenueAccumulated = await pool.revenueAccumulated();
      expect(revenueAccumulated).to.equal(REVENUE_AMOUNT);
    });
  });

  describe("Tiered Fee Structure", function () {
    it("should use different fee rates for funding vs revenue", async function () {
      // Check the initial fees
      const initialFundingFeeBps = await pool.fundingFeeBps();
      const initialRevenueFeeBps = await pool.revenueFeeBps();

      console.log("Initial fees:", {
        fundingFee: `${Number(initialFundingFeeBps) / 100}%`,
        revenueFee: `${Number(initialRevenueFeeBps) / 100}%`,
      });

      // Get initial balances
      const initialFeeRecipientBalance = await usdc.balanceOf(
        feeRecipient.address
      );

      // Fund the pool to reach target
      const commitsNeeded = Math.ceil(
        Number(TARGET_AMOUNT) / Number(TIER_PRICE)
      );
      for (let i = 0; i < commitsNeeded; i++) {
        await usdc.connect(user1).approve(await pool.getAddress(), TIER_PRICE);
        await pool.connect(user1).commitToTier(0, TIER_PRICE);
      }

      // Begin execution to trigger success fee collection using the funding fee rate
      await pool.connect(owner).beginExecution();

      // Check success fee was collected at the funding rate
      const expectedSuccessFee =
        (TARGET_AMOUNT * BigInt(initialFundingFeeBps)) / 10000n;
      let currentFeeRecipientBalance = await usdc.balanceOf(
        feeRecipient.address
      );

      const successFeeCollected =
        currentFeeRecipientBalance - initialFeeRecipientBalance;
      expect(successFeeCollected).to.equal(expectedSuccessFee);

      // Deposit revenue - which will use the revenue fee rate
      await usdc
        .connect(owner)
        .approve(await pool.getAddress(), REVENUE_AMOUNT);
      await pool.connect(owner).receiveRevenue(REVENUE_AMOUNT);

      // Check revenue fee was collected at the revenue rate
      const expectedRevenueFee =
        (REVENUE_AMOUNT * BigInt(initialRevenueFeeBps)) / 10000n;
      const finalFeeRecipientBalance = await usdc.balanceOf(
        feeRecipient.address
      );

      const revenueFeeCollected =
        finalFeeRecipientBalance - currentFeeRecipientBalance;
      expect(revenueFeeCollected).to.equal(expectedRevenueFee);

      console.log("Fee comparison:");
      console.log(
        `- Success fee: ${Number(successFeeCollected) / 1e6} USDC (${
          Number(initialFundingFeeBps) / 100
        }%)`
      );
      console.log(
        `- Revenue fee: ${Number(revenueFeeCollected) / 1e6} USDC (${
          Number(initialRevenueFeeBps) / 100
        }%)`
      );
      console.log(
        `- Total platform fees: ${
          Number(successFeeCollected + revenueFeeCollected) / 1e6
        } USDC`
      );
    });
  });
});
