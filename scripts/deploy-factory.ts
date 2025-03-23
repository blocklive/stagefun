// @ts-nocheck
const { ethers } = require("hardhat");
const {
  getContractAddresses,
  updateContractAddresses,
  getCurrentNetworkConfig,
} = require("./config");
const fs = require("fs");
const path = require("path");
require("dotenv").config({ path: ".env.local" });

async function main() {
  console.log("Starting factory deployment...");

  // Get the deployer account
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with the account:", deployer.address);

  // Get USDC address from config
  const { usdc } = getContractAddresses();

  // Deploy implementation contracts first
  console.log("Deploying implementation contracts...");

  const StageDotFunLiquidity = await ethers.getContractFactory(
    "StageDotFunLiquidity"
  );
  const lpTokenImplementation = await StageDotFunLiquidity.deploy();
  await lpTokenImplementation.waitForDeployment();
  console.log(
    "StageDotFunLiquidity implementation deployed to:",
    await lpTokenImplementation.getAddress()
  );

  const StageDotFunNFT = await ethers.getContractFactory("StageDotFunNFT");
  const nftImplementation = await StageDotFunNFT.deploy();
  await nftImplementation.waitForDeployment();
  console.log(
    "StageDotFunNFT implementation deployed to:",
    await nftImplementation.getAddress()
  );

  const StageDotFunPool = await ethers.getContractFactory("StageDotFunPool");
  const poolImplementation = await StageDotFunPool.deploy();
  await poolImplementation.waitForDeployment();
  console.log(
    "StageDotFunPool implementation deployed to:",
    await poolImplementation.getAddress()
  );

  // Deploy factory with implementation addresses
  console.log("Deploying StageDotFunPoolFactory...");
  const StageDotFunPoolFactory = await ethers.getContractFactory(
    "StageDotFunPoolFactory"
  );
  const factory = await StageDotFunPoolFactory.deploy(
    usdc,
    await poolImplementation.getAddress(),
    await lpTokenImplementation.getAddress(),
    await nftImplementation.getAddress()
  );
  await factory.waitForDeployment();
  console.log(
    "StageDotFunPoolFactory deployed to:",
    await factory.getAddress()
  );

  // Update config with new addresses
  const updatedAddresses = updateContractAddresses({
    stageDotFunPoolFactory: await factory.getAddress(),
    poolImplementation: await poolImplementation.getAddress(),
    lpTokenImplementation: await lpTokenImplementation.getAddress(),
    nftImplementation: await nftImplementation.getAddress(),
  });

  // Log all deployed addresses
  console.log("\nDeployment Summary:");
  console.log("-------------------");
  console.log("Factory:", await factory.getAddress());
  console.log("Pool Implementation:", await poolImplementation.getAddress());
  console.log(
    "LP Token Implementation:",
    await lpTokenImplementation.getAddress()
  );
  console.log("NFT Implementation:", await nftImplementation.getAddress());

  // Update addresses.ts for frontend
  const addressesPath = path.join(
    __dirname,
    "../src/lib/contracts/addresses.ts"
  );
  const networkConfig = getCurrentNetworkConfig();
  const addressesContent = `/**
 * Contract addresses for different networks
 * Update these addresses when deploying new contracts
 */
export const CONTRACT_ADDRESSES = {
  monadTestnet: {
    stageDotFunPoolFactory: "${updatedAddresses.stageDotFunPoolFactory}",
    stageDotFunPoolImplementation: "${updatedAddresses.poolImplementation}",
    stageDotFunLiquidityImplementation: "${updatedAddresses.lpTokenImplementation}",
    stageDotFunNFTImplementation: "${updatedAddresses.nftImplementation}",
    usdc: "${usdc}",
  },
} as const;

/**
 * Network configuration
 */
export const NETWORK = {
  chainId: ${networkConfig.chainId},
  rpcUrl: "${networkConfig.rpcUrl}",
  explorerUrl: "${networkConfig.explorerUrl}",
} as const;

// Helper to get addresses for current network
export function getContractAddresses() {
  return CONTRACT_ADDRESSES.monadTestnet;
}
`;

  fs.writeFileSync(addressesPath, addressesContent);
  console.log("Updated addresses.ts with new contract address");

  // Wait for a few block confirmations
  console.log("Waiting for block confirmations...");
  await factory.deploymentTransaction().wait(5);
  console.log("Contract deployment confirmed");

  // Verify the contract on Sourcify if not on a local network
  if (
    ethers.network.name !== "hardhat" &&
    ethers.network.name !== "localhost"
  ) {
    console.log("Verifying contract on Sourcify...");
    try {
      await ethers.run("sourcify:verify", {
        address: await factory.getAddress(),
        constructorArguments: [
          usdc,
          await poolImplementation.getAddress(),
          await lpTokenImplementation.getAddress(),
          await nftImplementation.getAddress(),
        ],
      });
      console.log("Contract verified on Sourcify");
    } catch (error) {
      console.error("Error verifying contract:", error);
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
