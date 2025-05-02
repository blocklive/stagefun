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

  try {
    // First, we need to get current addresses content
    // Since we can't directly require a TS file in Node,
    // we'll load the file content and extract the object values

    // First try to get the file content if it exists
    let currentAddressesTs = "";
    try {
      currentAddressesTs = fs.readFileSync(addressesPath, "utf8");
    } catch (error) {
      // File doesn't exist yet, that's fine
    }

    // Initialize base structure for addresses
    let CONTRACT_ADDRESSES = {
      monadTestnet: {},
    };

    // Try to extract existing monadTestnet object
    if (currentAddressesTs) {
      const monadTestnetMatch = currentAddressesTs.match(
        /monadTestnet:\s*{([^}]*)}/s
      );

      if (monadTestnetMatch && monadTestnetMatch[1]) {
        // Parse each key-value pair
        const pairs = monadTestnetMatch[1].match(/(\w+):\s*["']([^"']+)["']/g);

        if (pairs) {
          pairs.forEach((pair) => {
            const [key, value] = pair.split(/:\s*["']/).map((s) => s.trim());
            // Remove trailing quotes
            const cleanValue = value.replace(/["',]+$/, "");
            if (key && cleanValue) {
              CONTRACT_ADDRESSES.monadTestnet[key] = cleanValue;
            }
          });
        }
      }
    }

    // Update with new address values
    CONTRACT_ADDRESSES.monadTestnet = {
      ...CONTRACT_ADDRESSES.monadTestnet,
      stageSwapFactory: updatedAddresses.stageSwapFactory,
      stageSwapRouter: updatedAddresses.stageSwapRouter,
      weth: updatedAddresses.weth,
    };

    // Generate file content
    const addressesContent = `/**
 * Contract addresses for different networks
 * Update these addresses when deploying new contracts
 */
export const CONTRACT_ADDRESSES = {
  monadTestnet: {
${Object.entries(CONTRACT_ADDRESSES.monadTestnet)
  .map(([key, value]) => `    ${key}: "${value}"`)
  .join(",\n")}
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
    console.log("Updated addresses.ts with new AMM contract addresses");
  } catch (error) {
    console.error("Error updating addresses.ts:", error);
  }

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
