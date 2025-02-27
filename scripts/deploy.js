// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// You can also run a script with `npx hardhat run <script>`. If you do that, Hardhat
// will compile your contracts, add the Hardhat Runtime Environment's members to the
// global scope, and execute the script.
const hre = require("hardhat");

async function main() {
  // For testing purposes, we'll use a mock USDC address
  // In production, you would use the actual USDC address for the network you're deploying to

  // Sepolia USDC address (this is a mock for testing)
  const USDC_ADDRESS =
    process.env.USDC_ADDRESS || "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238";

  console.log("Deploying PoolCommitment contract...");
  console.log("Using USDC address:", USDC_ADDRESS);

  // Deploy the PoolCommitment contract
  const PoolCommitment = await hre.ethers.getContractFactory("PoolCommitment");
  const poolCommitment = await PoolCommitment.deploy(USDC_ADDRESS);

  await poolCommitment.waitForDeployment();

  const address = await poolCommitment.getAddress();
  console.log(`PoolCommitment deployed to: ${address}`);

  // For verification purposes
  console.log("Contract deployment data:");
  console.log("- Network:", hre.network.name);
  console.log("- Contract address:", address);
  console.log("- USDC address:", USDC_ADDRESS);

  // Wait for a few block confirmations
  console.log("Waiting for block confirmations...");
  await poolCommitment.deploymentTransaction().wait(5);
  console.log("Contract deployment confirmed");

  // Verify the contract on Etherscan if not on a local network
  if (hre.network.name !== "hardhat" && hre.network.name !== "localhost") {
    console.log("Verifying contract on Etherscan...");
    try {
      await hre.run("verify:verify", {
        address: address,
        constructorArguments: [USDC_ADDRESS],
      });
      console.log("Contract verified on Etherscan");
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
