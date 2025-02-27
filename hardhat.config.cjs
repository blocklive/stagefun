require("@nomicfoundation/hardhat-toolbox");
const fs = require("fs");
const path = require("path");

// Load environment variables from .env.local
require("dotenv").config({ path: ".env.local" });

// Debug: Log environment variables
console.log("Environment variables loaded:");
console.log(
  "- BLOCKCHAIN_PRIVATE_KEY set:",
  !!process.env.BLOCKCHAIN_PRIVATE_KEY
);
console.log("- MONAD_TESTNET_RPC_URL:", process.env.MONAD_TESTNET_RPC_URL);

// Fallback private key for development only
const FALLBACK_PRIVATE_KEY =
  "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";

// Try to read .env.local file directly if environment variables aren't loaded
let privateKey = process.env.BLOCKCHAIN_PRIVATE_KEY;
let monadTestnetRpcUrl = process.env.MONAD_TESTNET_RPC_URL;

if (!privateKey || !monadTestnetRpcUrl) {
  try {
    console.log("Attempting to read .env.local file directly...");
    const envPath = path.resolve(process.cwd(), ".env.local");
    const envContent = fs.readFileSync(envPath, "utf8");

    // Parse the file content to extract variables
    const envLines = envContent.split("\n");
    for (const line of envLines) {
      if (line.trim() && !line.startsWith("#")) {
        const [key, value] = line.split("=");
        if (key && value) {
          if (key.trim() === "BLOCKCHAIN_PRIVATE_KEY" && !privateKey) {
            privateKey = value.trim();
            console.log("- Found BLOCKCHAIN_PRIVATE_KEY in .env.local file");
          }
          if (key.trim() === "MONAD_TESTNET_RPC_URL" && !monadTestnetRpcUrl) {
            monadTestnetRpcUrl = value.trim();
            console.log(
              "- Found MONAD_TESTNET_RPC_URL in .env.local file:",
              monadTestnetRpcUrl
            );
          }
        }
      }
    }
  } catch (error) {
    console.error("Error reading .env.local file:", error.message);
  }
}

// Use fallback if still not found
if (!privateKey) {
  console.log("Using fallback private key");
  privateKey = FALLBACK_PRIVATE_KEY;
}

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: "0.8.28",
  networks: {
    hardhat: {
      chainId: 1337,
      blockGasLimit: 30000000,
    },
    localhost: {
      url: "http://127.0.0.1:8545",
      chainId: 1337,
    },
    monadTestnet: {
      url: monadTestnetRpcUrl || "https://testnet-rpc.monad.xyz",
      chainId: 10143,
      accounts: privateKey ? [privateKey] : [],
      gas: 3000000,
    },
    monadMainnet: {
      url: process.env.MONAD_MAINNET_RPC_URL || "https://rpc.monad.xyz",
      chainId: 1284,
      accounts: privateKey ? [privateKey] : [],
      gas: 3000000,
    },
    sepolia: {
      url: process.env.SEPOLIA_RPC_URL,
      accounts: privateKey ? [privateKey] : [],
      gas: 3000000,
    },
    baseSepolia: {
      url: process.env.BASE_SEPOLIA_RPC_URL,
      accounts: privateKey ? [privateKey] : [],
      gas: 3000000,
    },
  },
  etherscan: {
    apiKey: process.env.ETHERSCAN_API_KEY,
  },
};
