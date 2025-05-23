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
      stageDotFunPoolFactory: updatedAddresses.stageDotFunPoolFactory,
      stageDotFunPoolImplementation: updatedAddresses.poolImplementation,
      stageDotFunLiquidityImplementation:
        updatedAddresses.lpTokenImplementation,
      stageDotFunNFTImplementation: updatedAddresses.nftImplementation,
      usdc: usdc,
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
    console.log("Updated addresses.ts with new contract addresses");
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
      console.log("Verifying StageDotFunPoolFactory...");
      await runVerification(await factory.getAddress(), [
        usdc,
        await poolImplementation.getAddress(),
        await lpTokenImplementation.getAddress(),
        await nftImplementation.getAddress(),
      ]);

      // Verify the implementation contracts
      console.log("Verifying StageDotFunPool implementation...");
      await runVerification(await poolImplementation.getAddress(), []);

      console.log("Verifying StageDotFunLiquidity implementation...");
      await runVerification(await lpTokenImplementation.getAddress(), []);

      console.log("Verifying StageDotFunNFT implementation...");
      await runVerification(await nftImplementation.getAddress(), []);
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
