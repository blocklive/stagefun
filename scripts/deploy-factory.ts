// @ts-nocheck
const hre = require("hardhat");
const fs = require("fs");
const path = require("path");
require("dotenv").config({ path: ".env.local" });
const { CONTRACT_ADDRESSES } = require("./addresses");

async function main() {
  console.log("Starting factory deployment...");

  // Get the deployer account
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying contracts with the account:", deployer.address);

  // USDC address for Monad testnet
  const usdcAddress = CONTRACT_ADDRESSES.usdc;

  // Deploy StageDotFunPoolFactory
  console.log("Deploying StageDotFunPoolFactory...");
  const StageDotFunPoolFactory = await hre.ethers.getContractFactory(
    "StageDotFunPoolFactory"
  );
  const factory = await StageDotFunPoolFactory.deploy(usdcAddress);
  await factory.waitForDeployment();
  const factoryAddress = await factory.getAddress();
  console.log("StageDotFunPoolFactory deployed to:", factoryAddress);

  // Update addresses.ts
  const addressesPath = path.join(
    __dirname,
    "../src/lib/contracts/addresses.ts"
  );
  const addressesContent = `/**
 * Contract addresses for different networks
 * Update these addresses when deploying new contracts
 */
export const CONTRACT_ADDRESSES = {
  baseSepolia: {
    stageDotFunPoolFactory: "0x...", // We'll fill this after deployment
    usdc: "0xf817257fed379853cDe0fa4F97AB987181B1E5Ea",
  },
  monadTestnet: {
    stageDotFunPoolFactory: "${factoryAddress}",
    usdc: "${usdcAddress}",
  },
} as const;

/**
 * Network configuration
 */
export const NETWORK = {
  chainId: 10143, // Monad Testnet
  rpcUrl: "https://falling-practical-rain.monad-testnet.quiknode.pro/a5d256e0fcaf1ff2574b5d13322cb315b0cec88f",
  explorerUrl: "https://testnet.monadexplorer.com",
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
    hre.ethers.network.name !== "hardhat" &&
    hre.ethers.network.name !== "localhost"
  ) {
    console.log("Verifying contract on Sourcify...");
    try {
      await hre.ethers.run("sourcify:verify", {
        address: factoryAddress,
        constructorArguments: [usdcAddress],
      });
      console.log("Contract verified on Sourcify");
    } catch (error) {
      console.error("Error verifying contract:", error);
    }
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
