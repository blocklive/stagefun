# Deploying to Monad Blockchain

This guide explains how to deploy the StageFun contracts to the Monad blockchain.

## What is Monad?

[Monad](https://docs.monad.xyz/) is a high-performance Ethereum-compatible L1 blockchain that offers 10,000 transactions per second while maintaining compatibility with Ethereum tooling. It uses a novel parallel execution engine to achieve high throughput without sacrificing decentralization or security.

## Prerequisites

1. Node.js and npm installed
2. Hardhat installed (`npm install --save-dev hardhat`)
3. A wallet with Monad testnet tokens (for testnet deployment)
4. Your private key added to `.env.local` as `BLOCKCHAIN_PRIVATE_KEY`

## Getting Monad Testnet Tokens

To get Monad testnet tokens:

1. Visit the [Monad Faucet](https://faucet.monad.xyz/)
2. Connect your wallet
3. Request testnet tokens

## Configuration

The project is already configured to work with Monad. The configuration is in:

- `hardhat.config.js` - Network configuration for Monad
- `.env.local` - Environment variables for Monad RPC URLs and private keys

## Deployment Steps

### 1. Local Development

To deploy to a local Hardhat node:

```bash
# Start a local Hardhat node
npx hardhat node

# In a new terminal, deploy the contracts
npm run deploy:monad-local
```

### 2. Testnet Deployment

To deploy to Monad testnet:

```bash
npm run deploy:monad-testnet
```

This will:

1. Deploy the MockUSDC contract
2. Deploy the PoolCommitment contract
3. Mint some test USDC tokens
4. Output the contract addresses to add to your `.env.local` file

### 3. Update Environment Variables

After deployment, update your `.env.local` file with the contract addresses:

```
NEXT_PUBLIC_POOL_COMMITMENT_ADDRESS=<deployed-address>
NEXT_PUBLIC_USDC_ADDRESS=<deployed-address>
```

## Verifying Contracts

Contract verification on Monad is supported through the Monad Explorer. The deployment script will attempt to verify the contracts automatically.

## Interacting with Deployed Contracts

You can interact with the deployed contracts using:

1. The StageFun web interface
2. Directly through Hardhat scripts
3. Through the Monad Explorer

## Troubleshooting

### Transaction Errors

If you encounter transaction errors:

1. Ensure you have enough Monad tokens for gas
2. Check that your RPC URL is correct
3. Verify that your private key is correctly set in `.env.local`

### Contract Verification Failures

If contract verification fails:

1. Wait a few more blocks and try again
2. Ensure you're using the correct compiler version
3. Check that the contract source code matches exactly what was deployed

## Resources

- [Monad Documentation](https://docs.monad.xyz/)
- [Monad Explorer](https://testnet.monadexplorer.com/)
- [Monad Faucet](https://faucet.monad.xyz/)
