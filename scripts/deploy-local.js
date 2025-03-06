// Script to deploy the contract to a local Hardhat network
const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  // Deploy USDC mock if needed
  const usdcAddress = "0xf817257fed379853cDe0fa4F97AB987181B1E5Ea"; // Monad testnet USDC

  // Deploy the pool contract
  const StageDotFunPool = await hre.ethers.getContractFactory(
    "StageDotFunPool"
  );
  const pool = await StageDotFunPool.deploy(usdcAddress);
  await pool.waitForDeployment();
  const poolAddress = await pool.getAddress();

  console.log("Deployment complete!");
  console.log("Pool deployed to:", poolAddress);

  // Update the addresses.ts file
  const addressesPath = path.join(
    __dirname,
    "../src/lib/contracts/addresses.ts"
  );
  const addressesContent = `/**
 * Contract addresses for the Monad testnet
 * Update these addresses when deploying new contracts
 */
export const CONTRACT_ADDRESSES = {
  stageDotFunPool: "${poolAddress}",
  usdc: "${usdcAddress}",
} as const;

/**
 * Network configuration
 */
export const NETWORK = {
  chainId: 10143, // Monad Testnet
  rpcUrl: "https://testnet-rpc.monad.xyz",
  explorerUrl: "https://testnet.monadexplorer.com",
} as const;
`;

  fs.writeFileSync(addressesPath, addressesContent);
  console.log("Updated addresses.ts with new contract addresses");
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
