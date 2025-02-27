const hre = require("hardhat");

// Print out the networks configuration
console.log("Networks configuration:");

// Custom replacer function to handle BigInt
const replacer = (key, value) => {
  if (typeof value === "bigint") {
    return value.toString();
  }
  return value;
};

console.log(JSON.stringify(hre.config.networks, replacer, 2));
