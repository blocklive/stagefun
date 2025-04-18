const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Pool Management and Revenue Distribution", function () {
  let factory;
  let poolImplementation;
  let lpTokenImplementation;
  let nftImplementation;
  let usdc;
  let owner;
  let user1;
  let user2;
  let pool;

  const POOL_NAME = "Test Pool";
  const POOL_UNIQUE_ID = "test-pool-1";
  const POOL_SYMBOL = "TEST";
  const TARGET_AMOUNT = ethers.parseUnits("1000", 6); // 1000 USDC
  const CAP_AMOUNT = ethers.parseUnits("2000", 6); // 2000 USDC
  const TIER_PRICE = ethers.parseUnits("100", 6); // 100 USDC
  const REVENUE_AMOUNT = ethers.parseUnits("500", 6); // 500 USDC

  beforeEach(async function () {
    // Get signers
    [owner, user1, user2] = await ethers.getSigners();

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

    // Create a pool with a paid tier
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
      tiers
    );
    const receipt = await tx.wait();
    const event = receipt.logs.find(
      (log) => log.fragment?.name === "PoolCreated"
    );
    const poolAddress = event.args[0];

    // Get pool contract
    pool = await ethers.getContractAt("StageDotFunPool", poolAddress);

    // Meet funding target for the main pool
    const commitsNeeded = Math.ceil(Number(TARGET_AMOUNT) / Number(TIER_PRICE));
    for (let i = 0; i < commitsNeeded; i++) {
      await usdc.connect(user1).approve(await pool.getAddress(), TIER_PRICE);
      await pool.connect(user1).commitToTier(0, TIER_PRICE);
    }

    // Check pool status to update state
    await pool.checkPoolStatus();

    // Verify pool is funded
    const status = await pool.status();
    expect(status).to.equal(4); // PoolStatus.FUNDED

    // Verify target is reached
    const targetReached = await pool.targetReached();
    expect(targetReached).to.be.true;
  });

  describe("Fund Withdrawal", function () {
    it("should not allow owner to withdraw funds before target is met", async function () {
      // Create a new pool for this test
      const endTime = Math.floor(Date.now() / 1000) + 86400;
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
        "test-pool-2",
        POOL_SYMBOL,
        endTime,
        owner.address,
        owner.address,
        TARGET_AMOUNT,
        CAP_AMOUNT,
        tiers
      );
      const receipt = await tx.wait();
      const event = receipt.logs.find(
        (log) => log.fragment?.name === "PoolCreated"
      );
      const poolAddress = event.args[0];
      const testPool = await ethers.getContractAt(
        "StageDotFunPool",
        poolAddress
      );

      // Approve and commit to tier (but not enough to meet target)
      await usdc
        .connect(user1)
        .approve(await testPool.getAddress(), TIER_PRICE);
      await testPool.connect(user1).commitToTier(0, TIER_PRICE);

      // Try to withdraw funds
      await expect(testPool.connect(owner).withdrawFunds(0)).to.be.revertedWith(
        "Target amount not reached"
      );
    });

    it("should not allow non-owner to withdraw funds", async function () {
      // Try to withdraw funds as non-owner
      await expect(pool.connect(user1).withdrawFunds(0)).to.be.reverted;
    });

    it("should allow owner to withdraw full balance when amount is 0", async function () {
      // Verify pool is funded
      const status = await pool.status();
      expect(status).to.equal(4); // PoolStatus.FUNDED

      // Verify target is reached
      const targetReached = await pool.targetReached();
      expect(targetReached).to.be.true;

      // Get initial balance
      const initialBalance = await usdc.balanceOf(owner.address);
      const poolBalance = await usdc.balanceOf(await pool.getAddress());

      // Withdraw full balance
      await expect(pool.connect(owner).withdrawFunds(0))
        .to.emit(pool, "FundsWithdrawn")
        .withArgs(owner.address, poolBalance);

      // Verify USDC balance increased by full pool balance
      const finalBalance = await usdc.balanceOf(owner.address);
      expect(finalBalance).to.equal(initialBalance + poolBalance);
    });

    it("should allow owner to withdraw specific amount", async function () {
      // Verify pool is funded
      const status = await pool.status();
      expect(status).to.equal(4); // PoolStatus.FUNDED

      // Verify target is reached
      const targetReached = await pool.targetReached();
      expect(targetReached).to.be.true;

      // Get initial balance
      const initialBalance = await usdc.balanceOf(owner.address);
      const withdrawAmount = ethers.parseUnits("500", 6); // 500 USDC

      // Withdraw specific amount
      await expect(pool.connect(owner).withdrawFunds(withdrawAmount))
        .to.emit(pool, "FundsWithdrawn")
        .withArgs(owner.address, withdrawAmount);

      // Verify USDC balance increased by withdraw amount
      const finalBalance = await usdc.balanceOf(owner.address);
      expect(finalBalance).to.equal(initialBalance + withdrawAmount);
    });

    it("should not allow withdrawing more than pool balance", async function () {
      // Verify pool is funded
      const status = await pool.status();
      expect(status).to.equal(4); // PoolStatus.FUNDED

      // Verify target is reached
      const targetReached = await pool.targetReached();
      expect(targetReached).to.be.true;

      const poolBalance = await usdc.balanceOf(await pool.getAddress());
      const tooMuch = poolBalance + ethers.parseUnits("1", 6);

      // Try to withdraw more than pool balance
      await expect(
        pool.connect(owner).withdrawFunds(tooMuch)
      ).to.be.revertedWith("Insufficient funds");
    });
  });

  describe("Refund Mechanism", function () {
    it("should allow users to get refunds if target is not met after end time", async function () {
      // Create a new pool for this test with a longer end time to avoid validation error
      const endTime = Math.floor(Date.now() / 1000) + 3600; // 1 hour from now
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
        "test-pool-3",
        POOL_SYMBOL,
        endTime,
        owner.address,
        owner.address,
        TARGET_AMOUNT,
        CAP_AMOUNT,
        tiers
      );
      const receipt = await tx.wait();
      const event = receipt.logs.find(
        (log) => log.fragment?.name === "PoolCreated"
      );
      const poolAddress = event.args[0];
      const testPool = await ethers.getContractAt(
        "StageDotFunPool",
        poolAddress
      );

      // Approve and commit to tier (but not enough to meet target)
      await usdc
        .connect(user1)
        .approve(await testPool.getAddress(), TIER_PRICE);
      await testPool.connect(user1).commitToTier(0, TIER_PRICE);

      // Fast forward time past end time
      await ethers.provider.send("evm_increaseTime", [7200]); // 2 hours
      await ethers.provider.send("evm_mine");

      // Check pool status (should mark as failed)
      await testPool.checkPoolStatus();

      // Verify pool is failed
      const status = await testPool.status();
      expect(status).to.equal(6); // PoolStatus.FAILED

      // Get initial balance
      const initialBalance = await usdc.balanceOf(user1.address);

      // Request refund
      await expect(testPool.connect(user1).claimRefund())
        .to.emit(testPool, "FundsReturned")
        .withArgs(user1.address, TIER_PRICE);

      // Verify USDC balance increased
      const finalBalance = await usdc.balanceOf(user1.address);
      expect(finalBalance).to.equal(initialBalance + TIER_PRICE);
    });

    it("should not allow refunds if target is met", async function () {
      // Try to request refund on the main pool (which has met its target)
      await expect(pool.connect(user1).claimRefund()).to.be.revertedWith(
        "Pool has not failed"
      );
    });
  });

  describe("Revenue Distribution", function () {
    it("should distribute revenue proportionally to LP holders", async function () {
      // Verify pool is funded and can accept more commitments
      const status = await pool.status();
      expect(status).to.equal(4); // PoolStatus.FUNDED

      // Add more deposits from user2
      await usdc.connect(user2).approve(await pool.getAddress(), TIER_PRICE);
      await pool.connect(user2).commitToTier(0, TIER_PRICE);

      // Send revenue to pool
      await usdc
        .connect(owner)
        .approve(await pool.getAddress(), REVENUE_AMOUNT);
      await pool.connect(owner).receiveRevenue(REVENUE_AMOUNT);

      // Get initial balances
      const user1InitialBalance = await usdc.balanceOf(user1.address);
      const user2InitialBalance = await usdc.balanceOf(user2.address);

      // Distribute revenue
      await expect(pool.connect(owner).distributeRevenue())
        .to.emit(pool, "RevenueDistributed")
        .withArgs(REVENUE_AMOUNT);

      // Calculate expected shares
      const lpToken = await ethers.getContractAt(
        "StageDotFunLiquidity",
        await pool.lpToken()
      );
      const totalSupply = await lpToken.totalSupply();
      const user1Balance = await lpToken.balanceOf(user1.address);
      const user2Balance = await lpToken.balanceOf(user2.address);
      const user1Share = (REVENUE_AMOUNT * user1Balance) / totalSupply;
      const user2Share = (REVENUE_AMOUNT * user2Balance) / totalSupply;

      // Verify balances increased by correct amounts
      const user1FinalBalance = await usdc.balanceOf(user1.address);
      const user2FinalBalance = await usdc.balanceOf(user2.address);

      expect(user1FinalBalance).to.equal(user1InitialBalance + user1Share);
      expect(user2FinalBalance).to.equal(user2InitialBalance + user2Share);
    });
  });
});
