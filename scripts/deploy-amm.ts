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
  console.log("Starting AMM deployment...");

  // Get the deployer account
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with the account:", deployer.address);

  // Get USDC address from config
  const { usdc } = getContractAddresses();

  // Deploy the factory contract first
  console.log("Deploying StageSwapFactory...");
  const StageSwapFactory = await ethers.getContractFactory("StageSwapFactory");
  const factory = await StageSwapFactory.deploy();
  await factory.waitForDeployment();
  console.log("StageSwapFactory deployed to:", await factory.getAddress());

  // Deploy WETH (we'll use a simple version for testnet)
  console.log("Deploying WETH...");
  const WETH = await ethers.getContractFactory("WETH");
  const weth = await WETH.deploy();
  await weth.waitForDeployment();
  console.log("WETH deployed to:", await weth.getAddress());

  // Deploy the router with factory and WETH addresses
  console.log("Deploying StageSwapRouter...");
  const StageSwapRouter = await ethers.getContractFactory("StageSwapRouter");
  const router = await StageSwapRouter.deploy(
    await factory.getAddress(),
    await weth.getAddress()
  );
  await router.waitForDeployment();
  console.log("StageSwapRouter deployed to:", await router.getAddress());

  // Create the USDC/MON pair (MON is native ETH)
  console.log("Creating initial USDC/MON pair...");
  await factory.createPair(usdc, await weth.getAddress());
  console.log("Pair created");

  // Update config with new addresses
  const updatedAddresses = updateContractAddresses({
    stageSwapFactory: await factory.getAddress(),
    stageSwapRouter: await router.getAddress(),
    weth: await weth.getAddress(),
  });

  // Log all deployed addresses
  console.log("\nDeployment Summary:");
  console.log("-------------------");
  console.log("Factory:", await factory.getAddress());
  console.log("Router:", await router.getAddress());
  console.log("WETH:", await weth.getAddress());

  // Update addresses.ts for frontend
  const addressesPath = path.join(
    __dirname,
    "../src/lib/contracts/addresses.ts"
  );
  const networkConfig = getCurrentNetworkConfig();

  // Read the current file
  let addressesContent = fs.readFileSync(addressesPath, "utf8");

  // Parse the content to find the CONTRACT_ADDRESSES object
  const contractAddressesStartIndex = addressesContent.indexOf(
    "export const CONTRACT_ADDRESSES = {"
  );
  const contractAddressesEndIndex =
    addressesContent.indexOf("} as const;", contractAddressesStartIndex) + 10;

  const beforeContractAddresses = addressesContent.substring(
    0,
    contractAddressesStartIndex
  );
  const afterContractAddresses = addressesContent.substring(
    contractAddressesEndIndex
  );

  // Extract the current addresses object
  const currentAddressesObject = addressesContent.substring(
    contractAddressesStartIndex,
    contractAddressesEndIndex
  );

  // Insert new addresses
  const newAddressesObject = currentAddressesObject.replace(
    "monadTestnet: {",
    `monadTestnet: {
    stageSwapFactory: "${updatedAddresses.stageSwapFactory}",
    stageSwapRouter: "${updatedAddresses.stageSwapRouter}",
    weth: "${updatedAddresses.weth}",`
  );

  // Reconstruct the file
  const newAddressesContent =
    beforeContractAddresses + newAddressesObject + afterContractAddresses;

  fs.writeFileSync(addressesPath, newAddressesContent);
  console.log("Updated addresses.ts with new AMM contract addresses");

  // Wait for a few block confirmations
  console.log("Waiting for block confirmations...");
  await factory.deploymentTransaction().wait(5);
  console.log("Contract deployment confirmed");

  // Verify the contract on Monad Explorer if not on a local network
  if (
    ethers.network.name !== "hardhat" &&
    ethers.network.name !== "localhost"
  ) {
    console.log("Verifying contracts on Monad Explorer...");

    try {
      // Verify the factory contract
      console.log("Verifying StageSwapFactory...");
      await runVerification(await factory.getAddress(), []);

      // Verify the WETH contract
      console.log("Verifying WETH...");
      await runVerification(await weth.getAddress(), []);

      // Verify the router contract
      console.log("Verifying StageSwapRouter...");
      await runVerification(await router.getAddress(), [
        await factory.getAddress(),
        await weth.getAddress(),
      ]);
    } catch (error) {
      console.error("Error verifying contracts:", error);
    }
  }
}

// Helper function for contract verification
async function runVerification(contractAddress, constructorArgs) {
  try {
    await ethers.run("verify", {
      address: contractAddress,
      constructorArguments: constructorArgs,
      network: "monadTestnet",
    });
    console.log(`Successfully verified contract at ${contractAddress}`);
  } catch (error) {
    console.error(`Verification failed for ${contractAddress}:`, error);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
