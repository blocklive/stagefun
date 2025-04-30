const { ethers } = require("hardhat");

async function main() {
  // Get the bytecode of the StageSwapPair contract
  const pairFactory = await ethers.getContractFactory("StageSwapPair");
  const bytecode = pairFactory.bytecode;

  // Calculate the init code hash
  const initCodeHash = ethers.keccak256(bytecode);

  console.log("Init code hash:", initCodeHash);
  console.log("This should be used in StageSwapLibrary.pairFor function");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
