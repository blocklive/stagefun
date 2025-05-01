const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("StageDotFunLiquidity", function () {
  let lpToken;
  let factory;
  let pool;
  let usdc;
  let poolImplementation;
  let lpTokenImplementation;
  let nftImplementation;
  let deployer;
  let account1;
  let account2;
  let deployerAddress;
  let account1Address;
  let account2Address;

  const tokenName = "Test Pool";
  const tokenSymbol = "TPLP";
  const POOL_UNIQUE_ID = "test-pool-1";
  const TARGET_AMOUNT = ethers.parseUnits("1000", 6); // 1000 USDC
  const CAP_AMOUNT = ethers.parseUnits("2000", 6); // 2000 USDC
  const TIER_PRICE = ethers.parseUnits("100", 6); // 100 USDC

  beforeEach(async function () {
    // Get signers
    [deployer, account1, account2] = await ethers.getSigners();
    deployerAddress = await deployer.getAddress();
    account1Address = await account1.getAddress();
    account2Address = await account2.getAddress();

    // Deploy USDC token (mock for testing)
    const MockUSDC = await ethers.getContractFactory("MockUSDC");
    usdc = await MockUSDC.deploy();
    await usdc.waitForDeployment();

    // Mint USDC to accounts for testing
    await usdc.mint(account1Address, ethers.parseUnits("10000", 6)); // 10000 USDC
    await usdc.mint(account2Address, ethers.parseUnits("10000", 6)); // 10000 USDC

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

    // Get current block timestamp
    const blockNum = await ethers.provider.getBlockNumber();
    const block = await ethers.provider.getBlock(blockNum);
    const currentTimestamp = block.timestamp;

    // Set end time in the future (1 day from now)
    const endTime = currentTimestamp + 86400;

    // Create a pool to get an LP token
    const tiers = [
      {
        name: "Paid Tier",
        price: TIER_PRICE,
        nftMetadata: "ipfs://paidtier",
        isVariablePrice: false,
        minPrice: 0,
        maxPrice: 0,
        maxPatrons: 100,
      },
    ];

    const tx = await factory.createPool(
      tokenName,
      POOL_UNIQUE_ID,
      tokenSymbol,
      endTime,
      deployerAddress,
      deployerAddress,
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

    // Get pool and LP token contracts
    pool = await ethers.getContractAt("StageDotFunPool", poolAddress);
    const details = await pool.getPoolDetails();
    const lpTokenAddress = details[9]; // lpTokenAddress is at index 9
    lpToken = await ethers.getContractAt(
      "StageDotFunLiquidity",
      lpTokenAddress
    );
  });

  describe("Initialization", function () {
    it("should set the correct name and symbol", async function () {
      expect(await lpToken.name()).to.equal(tokenName);
      expect(await lpToken.symbol()).to.equal(tokenSymbol);
    });

    it("should transfer ownership to the pool", async function () {
      expect(await lpToken.owner()).to.equal(await pool.getAddress());
    });
  });

  describe("Holder tracking", function () {
    it("should add an address to holders when tokens are minted through tier commitments", async function () {
      // Initially there should be no holders
      expect(await lpToken.getHolderCount()).to.equal(0);

      // Approve USDC for account1 to use in commitToTier
      await usdc.connect(account1).approve(await pool.getAddress(), TIER_PRICE);

      // Commit to tier 0 (paid tier) which will mint LP tokens
      await pool.connect(account1).commitToTier(0, TIER_PRICE);

      // Now there should be one holder
      expect(await lpToken.getHolderCount()).to.equal(1);
      expect(await lpToken.isHolder(account1Address)).to.equal(true);

      const holders = await lpToken.getHolders();
      expect(holders.length).to.equal(1);
      expect(holders[0]).to.equal(account1Address);
    });

    it("should remove an address from holders when balance becomes zero through refund", async function () {
      // Approve USDC for account1 to use in commitToTier
      await usdc.connect(account1).approve(await pool.getAddress(), TIER_PRICE);

      // Commit to tier 0 (paid tier) which will mint LP tokens
      await pool.connect(account1).commitToTier(0, TIER_PRICE);
      expect(await lpToken.getHolderCount()).to.equal(1);

      // Fast forward past the end time to make the pool fail
      await ethers.provider.send("evm_increaseTime", [86401]); // 24 hours + 1 second
      await ethers.provider.send("evm_mine");

      // Update pool status to FAILED
      await pool.checkPoolStatus();

      // Claim refund which burns LP tokens
      await pool.connect(account1).claimRefund();

      // Now there should be no holders
      expect(await lpToken.getHolderCount()).to.equal(0);
      expect(await lpToken.isHolder(account1Address)).to.equal(false);
    });
  });

  describe("Minting and burning", function () {
    it("should only allow the pool to mint tokens through commitToTier", async function () {
      // Approve USDC for account1
      await usdc.connect(account1).approve(await pool.getAddress(), TIER_PRICE);

      // Commit to tier (which mints LP tokens)
      await pool.connect(account1).commitToTier(0, TIER_PRICE);

      // Check LP token balance (considering the LP_TOKEN_MULTIPLIER = 1000)
      const expectedLpBalance = TIER_PRICE * 1000n;
      expect(await lpToken.balanceOf(account1Address)).to.equal(
        expectedLpBalance
      );

      // Non-owner cannot mint directly
      await expect(lpToken.connect(account1).mint(account2Address, 100)).to.be
        .reverted;
    });

    it("should only allow the pool to burn tokens through claimRefund", async function () {
      // Approve USDC for account1
      await usdc.connect(account1).approve(await pool.getAddress(), TIER_PRICE);

      // Commit to tier 0 (paid tier) which will mint LP tokens
      await pool.connect(account1).commitToTier(0, TIER_PRICE);

      // Fast forward past the end time to make the pool fail
      await ethers.provider.send("evm_increaseTime", [86401]); // 24 hours + 1 second
      await ethers.provider.send("evm_mine");

      // Update pool status to FAILED
      await pool.checkPoolStatus();

      // Non-owner cannot burn directly
      await expect(lpToken.connect(account1).burn(account1Address, 50)).to.be
        .reverted;

      // Initial balance before refund
      const initialBalance = await lpToken.balanceOf(account1Address);

      // Claim refund which burns LP tokens
      await pool.connect(account1).claimRefund();

      // Check that tokens were burned
      expect(await lpToken.balanceOf(account1Address)).to.equal(0);
    });
  });
});
