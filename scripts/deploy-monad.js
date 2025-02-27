const hre = require("hardhat");

async function main() {
  console.log("Deploying contracts to Monad...");

  // Get the network name
  const network = hre.network.name;
  console.log(`Network: ${network}`);

  // Debug: Check if the private key is being loaded
  console.log(
    "Checking network config:",
    JSON.stringify({
      url: hre.config.networks[network].url,
      chainId: hre.config.networks[network].chainId,
      hasAccounts:
        Array.isArray(hre.config.networks[network].accounts) &&
        hre.config.networks[network].accounts.length > 0,
    })
  );

  // Get the deployer account
  const signers = await hre.ethers.getSigners();
  console.log(`Found ${signers.length} signers`);

  if (signers.length === 0) {
    throw new Error(
      "No signers found. Make sure BLOCKCHAIN_PRIVATE_KEY is set in .env.local"
    );
  }

  const deployer = signers[0];
  console.log(`Deploying with account: ${deployer.address}`);

  // Check balance
  const balance = await hre.ethers.provider.getBalance(deployer.address);
  console.log(`Account balance: ${hre.ethers.formatEther(balance)} MONAD`);

  // Deploy MockUSDC
  console.log("Deploying MockUSDC...");
  const MockUSDC = await hre.ethers.getContractFactory("MockUSDC");
  const mockUSDC = await MockUSDC.deploy("USD Coin", "USDC", 6);
  await mockUSDC.waitForDeployment();
  const mockUSDCAddress = await mockUSDC.getAddress();
  console.log(`MockUSDC deployed to: ${mockUSDCAddress}`);

  // Deploy PoolCommitment
  console.log("Deploying PoolCommitment...");
  const PoolCommitment = await hre.ethers.getContractFactory("PoolCommitment");
  const poolCommitment = await PoolCommitment.deploy(mockUSDCAddress);
  await poolCommitment.waitForDeployment();
  const poolCommitmentAddress = await poolCommitment.getAddress();
  console.log(`PoolCommitment deployed to: ${poolCommitmentAddress}`);

  // Mint some USDC to the deployer
  console.log("Minting USDC...");
  const mintAmount = hre.ethers.parseUnits("10000", 6); // USDC has 6 decimals
  const mintTx = await mockUSDC.mint(deployer.address, mintAmount);
  await mintTx.wait();
  console.log(`Minted 10,000 USDC to ${deployer.address}`);

  // Print the contract addresses for .env.local
  console.log("\n----- Add these to your .env.local file -----");
  console.log(`NEXT_PUBLIC_POOL_COMMITMENT_ADDRESS=${poolCommitmentAddress}`);
  console.log(`NEXT_PUBLIC_USDC_ADDRESS=${mockUSDCAddress}`);
  console.log("--------------------------------------------\n");

  // Verify contracts if not on local network
  if (network !== "hardhat" && network !== "localhost") {
    console.log("\nWaiting for block confirmations before verification...");
    // Wait for 5 blocks for better chances of successful verification
    await new Promise((resolve) => setTimeout(resolve, 30000));

    console.log("Verifying MockUSDC...");
    try {
      await hre.run("verify:verify", {
        address: mockUSDCAddress,
        constructorArguments: ["USD Coin", "USDC", 6],
      });
    } catch (error) {
      console.log("Error verifying MockUSDC:", error.message);
    }

    console.log("Verifying PoolCommitment...");
    try {
      await hre.run("verify:verify", {
        address: poolCommitmentAddress,
        constructorArguments: [mockUSDCAddress],
      });
    } catch (error) {
      console.log("Error verifying PoolCommitment:", error.message);
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
