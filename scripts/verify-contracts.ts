// @ts-nocheck
const { ethers } = require("hardhat");
const hre = require("hardhat");

async function main() {
  // Get contract addresses from the addresses.ts file
  const { readFileSync } = require("fs");
  const { join } = require("path");

  const addressesPath = join(__dirname, "../src/lib/contracts/addresses.ts");
  const addressesContent = readFileSync(addressesPath, "utf8");

  // Extract addresses using regex
  const factoryMatch = addressesContent.match(
    /stageDotFunPoolFactory: "([^"]+)"/
  );
  const poolImplMatch = addressesContent.match(
    /stageDotFunPoolImplementation: "([^"]+)"/
  );
  const lpTokenImplMatch = addressesContent.match(
    /stageDotFunLiquidityImplementation: "([^"]+)"/
  );
  const nftImplMatch = addressesContent.match(
    /stageDotFunNFTImplementation: "([^"]+)"/
  );
  const usdcMatch = addressesContent.match(/usdc: "([^"]+)"/);

  if (
    !factoryMatch ||
    !poolImplMatch ||
    !lpTokenImplMatch ||
    !nftImplMatch ||
    !usdcMatch
  ) {
    console.error("Failed to extract contract addresses from addresses.ts");
    process.exit(1);
  }

  const factoryAddress = factoryMatch[1];
  const poolImplAddress = poolImplMatch[1];
  const lpTokenImplAddress = lpTokenImplMatch[1];
  const nftImplAddress = nftImplMatch[1];
  const usdcAddress = usdcMatch[1];

  console.log("Verifying contracts with the following addresses:");
  console.log("Factory:", factoryAddress);
  console.log("Pool Implementation:", poolImplAddress);
  console.log("LP Token Implementation:", lpTokenImplAddress);
  console.log("NFT Implementation:", nftImplAddress);
  console.log("USDC:", usdcAddress);

  try {
    // Verify the factory contract
    console.log("\nVerifying StageDotFunPoolFactory...");
    await verifyContract(factoryAddress, [
      usdcAddress,
      poolImplAddress,
      lpTokenImplAddress,
      nftImplAddress,
    ]);

    // Verify the implementation contracts
    console.log("\nVerifying StageDotFunPool implementation...");
    await verifyContract(poolImplAddress, []);

    console.log("\nVerifying StageDotFunLiquidity implementation...");
    await verifyContract(lpTokenImplAddress, []);

    console.log("\nVerifying StageDotFunNFT implementation...");
    await verifyContract(nftImplAddress, []);

    console.log("\nVerification process completed.");
  } catch (error) {
    console.error("Error during verification process:", error);
  }
}

async function verifyContract(contractAddress, constructorArgs) {
  try {
    await hre.run("verify", {
      address: contractAddress,
      constructorArguments: constructorArgs,
      network: "monadTestnet",
    });
    console.log(`Successfully verified contract at ${contractAddress}`);
    return true;
  } catch (error) {
    console.error(`Verification failed for ${contractAddress}:`, error);
    return false;
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
