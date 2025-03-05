// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// You can also run a script with `npx hardhat run <script>`. If you do that, Hardhat
// will compile your contracts, add the Hardhat Runtime Environment's members to the
// global scope, and execute the script.
const hre = require("hardhat");
require("dotenv").config({ path: ".env.local" });

async function main() {
  console.log("Starting deployment...");

  // Get the deployer account
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying contracts with the account:", deployer.address);

  // Deploy StageDotFunPool
  console.log("Deploying StageDotFunPool...");
  const StageDotFunPool = await hre.ethers.getContractFactory(
    "StageDotFunPool"
  );
  const stageDotFunPool = await StageDotFunPool.deploy(
    process.env.NEXT_PUBLIC_USDC_ADDRESS
  );
  await stageDotFunPool.waitForDeployment();
  const stageDotFunPoolAddress = await stageDotFunPool.getAddress();
  console.log("StageDotFunPool deployed to:", stageDotFunPoolAddress);

  // Save the addresses to a file
  const addresses = {
    stageDotFunPool: stageDotFunPoolAddress,
    usdc: process.env.NEXT_PUBLIC_USDC_ADDRESS,
  };

  const fs = require("fs");
  fs.writeFileSync(
    "deployed-addresses.json",
    JSON.stringify(addresses, null, 2)
  );
  console.log("Deployed addresses saved to deployed-addresses.json");

  // Wait for a few block confirmations
  console.log("Waiting for block confirmations...");
  await stageDotFunPool.deploymentTransaction().wait(5);
  console.log("Contract deployment confirmed");

  // Verify the contract on Sourcify if not on a local network
  if (hre.network.name !== "hardhat" && hre.network.name !== "localhost") {
    console.log("Verifying contract on Sourcify...");
    try {
      await hre.run("sourcify:verify", {
        address: stageDotFunPoolAddress,
        constructorArguments: [process.env.NEXT_PUBLIC_USDC_ADDRESS],
      });
      console.log("Contract verified on Sourcify");
    } catch (error) {
      console.error("Error verifying contract:", error);
    }
  }
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
