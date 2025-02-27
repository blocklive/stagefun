#!/bin/bash

# Script to deploy contracts to Monad testnet
echo "Deploying contracts to Monad testnet..."

# Load environment variables
source .env.local

# Check if the required environment variables are set
if [ -z "$BLOCKCHAIN_PRIVATE_KEY" ]; then
  echo "Error: BLOCKCHAIN_PRIVATE_KEY is not set in .env.local"
  echo "Please add your private key to .env.local and try again"
  exit 1
fi

# Run the deployment script
npx hardhat run scripts/deploy-monad.js --network monadTestnet

# Check if the deployment was successful
if [ $? -eq 0 ]; then
  echo "Deployment to Monad testnet completed successfully!"
  echo "Please update your .env.local file with the contract addresses"
  echo "Then run 'npm run db:push' to apply the database migrations"
else
  echo "Deployment to Monad testnet failed"
  exit 1
fi 