import { expect } from "chai";
import { ethers } from "hardhat";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";
import { StageDotFunPool, StageDotFunLiquidity } from "../typechain-types";

describe("StageDotFunPool", function () {
  let stageDotFunPool: StageDotFunPool;
  let usdcToken: StageDotFunLiquidity;
  let owner: SignerWithAddress;
  let user1: SignerWithAddress;
  let user2: SignerWithAddress;

  beforeEach(async function () {
    // Get signers
    [owner, user1, user2] = await ethers.getSigners();

    // Deploy USDC token (mock for testing)
    const USDC = await ethers.getContractFactory("StageDotFunLiquidity");
    usdcToken = await USDC.deploy("USD Coin", "USDC");
    await usdcToken.waitForDeployment();

    // Deploy StageDotFunPool
    const StageDotFunPool = await ethers.getContractFactory("StageDotFunPool");
    stageDotFunPool = await StageDotFunPool.deploy(
      await usdcToken.getAddress()
    );
    await stageDotFunPool.waitForDeployment();

    // Mint some USDC to users for testing
    const amount = ethers.parseUnits("1000", 6); // 1000 USDC
    await usdcToken.mint(user1.address, amount);
    await usdcToken.mint(user2.address, amount);
  });

  describe("Pool Creation", function () {
    it("should create a new pool", async function () {
      const poolName = "Test Pool";
      await expect(stageDotFunPool.createPool(poolName))
        .to.emit(stageDotFunPool, "PoolCreated")
        .withArgs(ethers.keccak256(ethers.toUtf8Bytes(poolName)), poolName);

      const pool = await stageDotFunPool.getPool(
        ethers.keccak256(ethers.toUtf8Bytes(poolName))
      );
      expect(pool.name).to.equal(poolName);
      expect(pool.exists).to.be.true;
    });

    it("should not create a pool with the same name", async function () {
      const poolName = "Test Pool";
      await stageDotFunPool.createPool(poolName);

      await expect(stageDotFunPool.createPool(poolName)).to.be.revertedWith(
        "Pool already exists"
      );
    });
  });

  describe("Deposits", function () {
    const poolName = "Test Pool";
    const depositAmount = ethers.parseUnits("100", 6); // 100 USDC

    beforeEach(async function () {
      await stageDotFunPool.createPool(poolName);
    });

    it("should allow users to deposit USDC", async function () {
      // Approve USDC transfer
      await usdcToken
        .connect(user1)
        .approve(await stageDotFunPool.getAddress(), depositAmount);

      // Make deposit
      await expect(
        stageDotFunPool
          .connect(user1)
          .deposit(
            ethers.keccak256(ethers.toUtf8Bytes(poolName)),
            depositAmount
          )
      )
        .to.emit(stageDotFunPool, "Deposit")
        .withArgs(
          ethers.keccak256(ethers.toUtf8Bytes(poolName)),
          user1.address,
          depositAmount
        );

      // Check pool balance
      const pool = await stageDotFunPool.getPool(
        ethers.keccak256(ethers.toUtf8Bytes(poolName))
      );
      expect(pool.totalDeposits).to.equal(depositAmount);
    });

    it("should track LP token balances correctly", async function () {
      // Approve and deposit
      await usdcToken
        .connect(user1)
        .approve(await stageDotFunPool.getAddress(), depositAmount);
      await stageDotFunPool
        .connect(user1)
        .deposit(ethers.keccak256(ethers.toUtf8Bytes(poolName)), depositAmount);

      // Check LP token balance
      const lpTokenAddress = (
        await stageDotFunPool.getPool(
          ethers.keccak256(ethers.toUtf8Bytes(poolName))
        )
      ).lpTokenAddress;
      const lpToken = await ethers.getContractAt(
        "StageDotFunLiquidity",
        lpTokenAddress
      );
      const balance = await lpToken.balanceOf(user1.address);
      expect(balance).to.equal(depositAmount);
    });
  });

  describe("Revenue Distribution", function () {
    const poolName = "Test Pool";
    const depositAmount = ethers.parseUnits("100", 6); // 100 USDC
    const revenueAmount = ethers.parseUnits("50", 6); // 50 USDC

    beforeEach(async function () {
      await stageDotFunPool.createPool(poolName);
      await usdcToken
        .connect(user1)
        .approve(await stageDotFunPool.getAddress(), depositAmount);
      await stageDotFunPool
        .connect(user1)
        .deposit(ethers.keccak256(ethers.toUtf8Bytes(poolName)), depositAmount);
    });

    it("should receive and distribute revenue", async function () {
      // Approve and send revenue
      await usdcToken
        .connect(user2)
        .approve(await stageDotFunPool.getAddress(), revenueAmount);
      await stageDotFunPool
        .connect(user2)
        .receiveRevenue(
          ethers.keccak256(ethers.toUtf8Bytes(poolName)),
          revenueAmount
        );

      // Check revenue accumulated
      const pool = await stageDotFunPool.getPool(
        ethers.keccak256(ethers.toUtf8Bytes(poolName))
      );
      expect(pool.revenueAccumulated).to.equal(revenueAmount);

      // Distribute revenue
      await expect(
        stageDotFunPool.distributeRevenue(
          ethers.keccak256(ethers.toUtf8Bytes(poolName))
        )
      )
        .to.emit(stageDotFunPool, "RevenueDistributed")
        .withArgs(
          ethers.keccak256(ethers.toUtf8Bytes(poolName)),
          revenueAmount
        );

      // Check revenue distributed
      const updatedPool = await stageDotFunPool.getPool(
        ethers.keccak256(ethers.toUtf8Bytes(poolName))
      );
      expect(updatedPool.revenueAccumulated).to.equal(0);
    });
  });
});
