const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("StageDotFunLiquidity", function () {
  let lpToken;
  let deployer;
  let account1;
  let account2;
  let deployerAddress;
  let account1Address;
  let account2Address;

  const tokenName = "Test Pool LP Token";
  const tokenSymbol = "TPLP";

  beforeEach(async function () {
    // Get signers
    [deployer, account1, account2] = await ethers.getSigners();
    deployerAddress = await deployer.getAddress();
    account1Address = await account1.getAddress();
    account2Address = await account2.getAddress();

    // Deploy the LP token contract
    const LPTokenFactory = await ethers.getContractFactory(
      "StageDotFunLiquidity"
    );
    lpToken = await LPTokenFactory.deploy();
    await lpToken.waitForDeployment();

    // Initialize the token with name and symbol
    await lpToken.initialize(tokenName, tokenSymbol);
  });

  describe("Initialization", function () {
    it("should set the correct name and symbol", async function () {
      expect(await lpToken.name()).to.equal(tokenName);
      expect(await lpToken.symbol()).to.equal(tokenSymbol);
    });

    it("should not allow re-initialization", async function () {
      await expect(lpToken.initialize("New Name", "NEW")).to.be.revertedWith(
        "Already initialized"
      );
    });

    it("should transfer ownership to the initializer", async function () {
      expect(await lpToken.owner()).to.equal(deployerAddress);
    });
  });

  describe("Holder tracking", function () {
    it("should add an address to holders when tokens are minted", async function () {
      // Initially there should be no holders
      expect(await lpToken.getHolderCount()).to.equal(0);

      // Mint tokens to account1
      await lpToken.mint(account1Address, 100);

      // Now there should be one holder
      expect(await lpToken.getHolderCount()).to.equal(1);
      expect(await lpToken.isHolder(account1Address)).to.equal(true);

      const holders = await lpToken.getHolders();
      expect(holders.length).to.equal(1);
      expect(holders[0]).to.equal(account1Address);
    });

    it("should remove an address from holders when balance becomes zero", async function () {
      // Mint tokens to account1
      await lpToken.mint(account1Address, 100);
      expect(await lpToken.getHolderCount()).to.equal(1);

      // Burn all tokens from account1
      await lpToken.burn(account1Address, 100);

      // Now there should be no holders
      expect(await lpToken.getHolderCount()).to.equal(0);
      expect(await lpToken.isHolder(account1Address)).to.equal(false);
    });
  });

  describe("Minting and burning", function () {
    it("should only allow the owner to mint tokens", async function () {
      // Owner can mint
      await lpToken.mint(account1Address, 100);
      expect(await lpToken.balanceOf(account1Address)).to.equal(100);

      // Non-owner cannot mint
      await expect(lpToken.connect(account1).mint(account2Address, 100)).to.be
        .reverted;
    });

    it("should only allow the owner to burn tokens", async function () {
      // Mint tokens to account1
      await lpToken.mint(account1Address, 100);

      // Non-owner cannot burn
      await expect(lpToken.connect(account1).burn(account1Address, 50)).to.be
        .reverted;

      // Owner can burn
      await lpToken.burn(account1Address, 50);
      expect(await lpToken.balanceOf(account1Address)).to.equal(50);
    });
  });
});
