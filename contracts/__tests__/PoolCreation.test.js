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

  it("should create pool with initial tiers", async function () {
    // Create pool with initial tiers
    const endTime = Math.floor(Date.now() / 1000) + 86400; // 24 hours from now
    const tiers = [
      {
        name: "Free Tier",
        price: 0,
        nftMetadata: "ipfs://freetier",
        isVariablePrice: false,
        minPrice: 0,
        maxPrice: 0,
        maxPatrons: 100,
      },
      {
        name: "Paid Tier",
        price: TIER_PRICE,
        nftMetadata: "ipfs://paidtier",
        isVariablePrice: false,
        minPrice: 0,
        maxPrice: 0,
        maxPatrons: 50,
      },
      {
        name: "Variable Price Tier",
        price: 0,
        nftMetadata: "ipfs://variabletier",
        isVariablePrice: true,
        minPrice: 0,
        maxPrice: TIER_PRICE,
        maxPatrons: 0,
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
      ethers.ZeroAddress, // feeRecipient
      0, // fundingFeeBps
      0 // revenueFeeBps
    );
    const receipt = await tx.wait();
    const event = receipt.logs.find(
      (log) => log.fragment?.name === "PoolCreated"
    );
    const poolAddress = event.args[0];

    // Log the event and pool address for validation
    console.log("PoolCreated event:", {
      eventName: event.fragment?.name,
      args: event.args,
      poolAddress,
      topics: event.topics,
    });

    // Get pool contract
    const pool = await ethers.getContractAt("StageDotFunPool", poolAddress);

    // Verify tiers were created correctly
    const tierCount = await pool.getTierCount();
    expect(tierCount).to.equal(3);

    // Check free tier
    const freeTier = await pool.getTier(0);
    expect(freeTier.name).to.equal("Free Tier");
    expect(freeTier.price).to.equal(0);
    expect(freeTier.isVariablePrice).to.equal(false);
    expect(freeTier.maxPatrons).to.equal(100);

    // Check paid tier
    const paidTier = await pool.getTier(1);
    expect(paidTier.name).to.equal("Paid Tier");
    expect(paidTier.price).to.equal(TIER_PRICE);
    expect(paidTier.isVariablePrice).to.equal(false);
    expect(paidTier.maxPatrons).to.equal(50);

    // Check variable price tier
    const variableTier = await pool.getTier(2);
    expect(variableTier.name).to.equal("Variable Price Tier");
    expect(variableTier.price).to.equal(0);
    expect(variableTier.isVariablePrice).to.equal(true);
    expect(variableTier.minPrice).to.equal(0);
    expect(variableTier.maxPrice).to.equal(TIER_PRICE);
    expect(variableTier.maxPatrons).to.equal(0);
  });

  it("should allow user to commit to free tier", async function () {
    // Create pool with free tier
    const endTime = Math.floor(Date.now() / 1000) + 86400;
    const tiers = [
      {
        name: "Free Tier",
        price: 0,
        nftMetadata: "ipfs://freetier",
        isVariablePrice: false,
        minPrice: 0,
        maxPrice: 0,
        maxPatrons: 100,
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
      ethers.ZeroAddress, // feeRecipient
      0, // fundingFeeBps
      0 // revenueFeeBps
    );
    const receipt = await tx.wait();
    const event = receipt.logs.find(
      (log) => log.fragment?.name === "PoolCreated"
    );
    const poolAddress = event.args[0];

    // Get pool contract
    const pool = await ethers.getContractAt("StageDotFunPool", poolAddress);

    // Commit to free tier
    await pool.connect(user).commitToTier(0, 0);

    // Verify commitment
    const userTiers = await pool.getUserTierCommitments(user.address);
    expect(userTiers.length).to.equal(1);
    expect(userTiers[0]).to.equal(0);
  });

  it("should allow user to commit to variable price tier with zero minimum", async function () {
    // Create pool with variable price tier
    const endTime = Math.floor(Date.now() / 1000) + 86400;
    const tiers = [
      {
        name: "Variable Price Tier",
        price: 0,
        nftMetadata: "ipfs://variabletier",
        isVariablePrice: true,
        minPrice: 0,
        maxPrice: TIER_PRICE,
        maxPatrons: 0,
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
      ethers.ZeroAddress, // feeRecipient
      0, // fundingFeeBps
      0 // revenueFeeBps
    );
    const receipt = await tx.wait();
    const event = receipt.logs.find(
      (log) => log.fragment?.name === "PoolCreated"
    );
    const poolAddress = event.args[0];

    // Get pool contract
    const pool = await ethers.getContractAt("StageDotFunPool", poolAddress);

    // Approve USDC spending
    await usdc.connect(user).approve(poolAddress, TIER_PRICE);

    // Commit to variable price tier with zero amount
    await pool.connect(user).commitToTier(0, 0);

    // Verify commitment
    const userTiers = await pool.getUserTierCommitments(user.address);
    expect(userTiers.length).to.equal(1);
    expect(userTiers[0]).to.equal(0);
  });

  it("should fail to commit if USDC not approved", async function () {
    // Create pool with paid tier
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
      POOL_UNIQUE_ID,
      POOL_SYMBOL,
      endTime,
      owner.address,
      owner.address,
      TARGET_AMOUNT,
      CAP_AMOUNT,
      tiers,
      ethers.ZeroAddress, // feeRecipient
      0, // fundingFeeBps
      0 // revenueFeeBps
    );
    const receipt = await tx.wait();
    const event = receipt.logs.find(
      (log) => log.fragment?.name === "PoolCreated"
    );
    const poolAddress = event.args[0];

    // Get pool contract
    const pool = await ethers.getContractAt("StageDotFunPool", poolAddress);

    // Try to commit without approval
    await expect(
      pool.connect(user).commitToTier(0, TIER_PRICE)
    ).to.be.revertedWithCustomError(usdc, "ERC20InsufficientAllowance");
  });

  it("should fail to commit if tier not active", async function () {
    // Create pool with paid tier
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
      POOL_UNIQUE_ID,
      POOL_SYMBOL,
      endTime,
      owner.address,
      owner.address,
      TARGET_AMOUNT,
      CAP_AMOUNT,
      tiers,
      ethers.ZeroAddress, // feeRecipient
      0, // fundingFeeBps
      0 // revenueFeeBps
    );
    const receipt = await tx.wait();
    const event = receipt.logs.find(
      (log) => log.fragment?.name === "PoolCreated"
    );
    const poolAddress = event.args[0];

    // Get pool contract
    const pool = await ethers.getContractAt("StageDotFunPool", poolAddress);

    // Deactivate tier
    await pool.deactivateTier(0);

    // Approve USDC spending
    await usdc.connect(user).approve(poolAddress, TIER_PRICE);

    // Try to commit to deactivated tier
    await expect(
      pool.connect(user).commitToTier(0, TIER_PRICE)
    ).to.be.revertedWith("Tier not active");
  });

  it("should validate pool creation event and details", async function () {
    const endTime = Math.floor(Date.now() / 1000) + 86400;
    const tiers = [
      {
        name: "Test Tier",
        price: TIER_PRICE,
        nftMetadata: "ipfs://test",
        isVariablePrice: false,
        minPrice: 0,
        maxPrice: 0,
        maxPatrons: 100,
      },
    ];

    // Create pool
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
      ethers.ZeroAddress, // feeRecipient
      0, // fundingFeeBps
      0 // revenueFeeBps
    );
    const receipt = await tx.wait();

    // Validate event parsing
    const event = receipt.logs.find(
      (log) => log.fragment?.name === "PoolCreated"
    );
    expect(event).to.not.be.undefined;
    expect(event.args).to.not.be.undefined;

    // Log full event structure
    console.log("Full event structure:", {
      fragment: event.fragment,
      args: event.args.map((arg) => arg.toString()),
      topics: event.topics,
    });

    // Get pool address from event
    const poolAddress = event.args[0];
    expect(ethers.isAddress(poolAddress)).to.be.true;

    // Get pool contract
    const pool = await ethers.getContractAt("StageDotFunPool", poolAddress);

    // Get pool details and log them
    const details = await pool.getPoolDetails();
    console.log("Pool details structure:", {
      name: details[0],
      uniqueId: details[1],
      creator: details[2],
      totalDeposits: details[3].toString(),
      revenueAccumulated: details[4].toString(),
      endTime: details[5].toString(),
      targetAmount: details[6].toString(),
      capAmount: details[7].toString(),
      status: details[8].toString(),
      lpTokenAddress: details[9],
      nftContractAddress: details[10],
      tierCount: details[11].toString(),
    });

    // Validate pool details
    expect(details[0]).to.equal(POOL_NAME); // name
    expect(details[1]).to.equal(POOL_UNIQUE_ID); // uniqueId
    expect(details[2]).to.equal(owner.address); // creator
    expect(details[6]).to.equal(TARGET_AMOUNT); // targetAmount
    expect(details[7]).to.equal(CAP_AMOUNT); // capAmount
    expect(ethers.isAddress(details[9])).to.be.true; // lpTokenAddress
    expect(details[11]).to.equal(1n); // tierCount

    // Validate LP token contract
    const lpTokenAddress = details[9];
    expect(ethers.isAddress(lpTokenAddress)).to.be.true;
    const lpToken = await ethers.getContractAt(
      "StageDotFunLiquidity",
      lpTokenAddress
    );
    expect(await lpToken.getAddress()).to.equal(lpTokenAddress);
  });
});
