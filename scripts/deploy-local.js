// Script to deploy the contract to a local Hardhat network
const hre = require("hardhat");

async function main() {
  // For local testing, we'll deploy a mock USDC token first
  console.log("Deploying Mock USDC token...");

  // Deploy a simple ERC20 token to represent USDC
  const MockUSDC = await hre.ethers.getContractFactory("MockUSDC");
  const mockUSDC = await MockUSDC.deploy("Mock USDC", "USDC", 6); // USDC has 6 decimals

  await mockUSDC.waitForDeployment();
  const usdcAddress = await mockUSDC.getAddress();
  console.log(`Mock USDC deployed to: ${usdcAddress}`);

  // Now deploy the PoolCommitment contract with the mock USDC address
  console.log("Deploying PoolCommitment contract...");
  const PoolCommitment = await hre.ethers.getContractFactory("PoolCommitment");
  const poolCommitment = await PoolCommitment.deploy(usdcAddress);

  await poolCommitment.waitForDeployment();
  const poolAddress = await poolCommitment.getAddress();
  console.log(`PoolCommitment deployed to: ${poolAddress}`);

  // For testing, mint some USDC to the deployer
  const [deployer] = await hre.ethers.getSigners();
  const mintAmount = hre.ethers.parseUnits("10000", 6); // 10,000 USDC
  await mockUSDC.mint(deployer.address, mintAmount);
  console.log(
    `Minted ${hre.ethers.formatUnits(mintAmount, 6)} USDC to ${
      deployer.address
    }`
  );

  console.log("Deployment complete!");
  console.log("Contract addresses to add to your .env.local file:");
  console.log(`NEXT_PUBLIC_POOL_COMMITMENT_ADDRESS=${poolAddress}`);
  console.log(`NEXT_PUBLIC_USDC_ADDRESS=${usdcAddress}`);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
