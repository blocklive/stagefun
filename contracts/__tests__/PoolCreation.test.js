const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Pool Creation and Tier Commitment", function () {
  let factory;
  let poolImplementation;
  let lpTokenImplementation;
  let nftImplementation;
  let usdc;
  let owner;
  let user;

  const POOL_NAME = "Test Pool";
  const POOL_UNIQUE_ID = "test-pool-1";
  const POOL_SYMBOL = "TEST";
  const TARGET_AMOUNT = ethers.parseUnits("1000", 6); // 1000 USDC
  const CAP_AMOUNT = ethers.parseUnits("2000", 6); // 2000 USDC
  const TIER_PRICE = ethers.parseUnits("100", 6); // 100 USDC

  beforeEach(async function () {
    // Get signers
    [owner, user] = await ethers.getSigners();

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

    // Mint some USDC to user for testing
    await usdc.mint(user.address, ethers.parseUnits("10000", 6)); // 10000 USDC
  });

  it("should allow user to commit to tier", async function () {
    // Create pool
    const endTime = Math.floor(Date.now() / 1000) + 86400; // 24 hours from now
    const tx = await factory.createPool(
      POOL_NAME,
      POOL_UNIQUE_ID,
      POOL_SYMBOL,
      endTime,
      owner.address,
      owner.address,
      TARGET_AMOUNT,
      CAP_AMOUNT
    );
    const receipt = await tx.wait();
    const event = receipt.logs.find(
      (log) => log.fragment?.name === "PoolCreated"
    );
    const poolAddress = event.args[0];

    // Get pool contract
    const pool = await ethers.getContractAt("StageDotFunPool", poolAddress);

    // Create tier
    await pool.createTier(
      "Tier 1",
      TIER_PRICE,
      "ipfs://tier1metadata",
      false,
      0,
      0,
      0
    );

    // Approve USDC spending
    await usdc.connect(user).approve(poolAddress, TIER_PRICE);

    // Commit to tier
    await pool.connect(user).commitToTier(0, TIER_PRICE);

    // Verify commitment
    const userTiers = await pool.getUserTierCommitments(user.address);
    expect(userTiers.length).to.equal(1);
    expect(userTiers[0]).to.equal(0);
  });

  it("should fail to commit if USDC not approved", async function () {
    // Create pool
    const endTime = Math.floor(Date.now() / 1000) + 86400;
    const tx = await factory.createPool(
      POOL_NAME,
      POOL_UNIQUE_ID,
      POOL_SYMBOL,
      endTime,
      owner.address,
      owner.address,
      TARGET_AMOUNT,
      CAP_AMOUNT
    );
    const receipt = await tx.wait();
    const event = receipt.logs.find(
      (log) => log.fragment?.name === "PoolCreated"
    );
    const poolAddress = event.args[0];

    // Get pool contract
    const pool = await ethers.getContractAt("StageDotFunPool", poolAddress);

    // Create tier
    await pool.createTier(
      "Tier 1",
      TIER_PRICE,
      "ipfs://tier1metadata",
      false,
      0,
      0,
      0
    );

    // Try to commit without approval
    await expect(
      pool.connect(user).commitToTier(0, TIER_PRICE)
    ).to.be.revertedWithCustomError(usdc, "ERC20InsufficientAllowance");
  });

  it("should fail to commit if tier not active", async function () {
    // Create pool
    const endTime = Math.floor(Date.now() / 1000) + 86400;
    const tx = await factory.createPool(
      POOL_NAME,
      POOL_UNIQUE_ID,
      POOL_SYMBOL,
      endTime,
      owner.address,
      owner.address,
      TARGET_AMOUNT,
      CAP_AMOUNT
    );
    const receipt = await tx.wait();
    const event = receipt.logs.find(
      (log) => log.fragment?.name === "PoolCreated"
    );
    const poolAddress = event.args[0];

    // Get pool contract
    const pool = await ethers.getContractAt("StageDotFunPool", poolAddress);

    // Create tier
    await pool.createTier(
      "Tier 1",
      TIER_PRICE,
      "ipfs://tier1metadata",
      false,
      0,
      0,
      0
    );

    // Deactivate tier
    await pool.deactivateTier(0);

    // Approve USDC spending
    await usdc.connect(user).approve(poolAddress, TIER_PRICE);

    // Try to commit to deactivated tier
    await expect(
      pool.connect(user).commitToTier(0, TIER_PRICE)
    ).to.be.revertedWith("Tier not active");
  });
});
