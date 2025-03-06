const hre = require("hardhat");
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

  // Save the addresses to a file
  const addresses = {
    stageDotFunPoolFactory: factoryAddress,
    usdc: usdcAddress,
  };

  const fs = require("fs");
  fs.writeFileSync(
    "deployed-addresses.json",
    JSON.stringify(addresses, null, 2)
  );
  console.log("Deployed addresses saved to deployed-addresses.json");

  // Wait for a few block confirmations
  console.log("Waiting for block confirmations...");
  await factory.deploymentTransaction().wait(5);
  console.log("Contract deployment confirmed");

  // Verify the contract on Sourcify if not on a local network
  if (hre.network.name !== "hardhat" && hre.network.name !== "localhost") {
    console.log("Verifying contract on Sourcify...");
    try {
      await hre.run("sourcify:verify", {
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
