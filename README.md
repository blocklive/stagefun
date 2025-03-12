# StageFun - Party Rounds on Monad

StageFun is a decentralized platform for creating and managing party rounds for events, built on the Monad blockchain.

## Features

- Create party rounds with funding goals
- Commit funds to pools
- Receive tokens and patron passes
- Track pool progress and status
- Blockchain integration with Monad

## Technical Architecture

The project leverages a modern web3 stack combining robust frontend technologies with blockchain integration:

- **Frontend Framework**: Next.js for server-side rendering and React for component-based UI
- **Authentication & Wallet Management**: Privy for web3 authentication and wallet connections, Wagmi for React hooks providing declarative state management for blockchain interactions, and Viem for type-safe contract interactions
- **Backend & Data Storage**: Supabase PostgreSQL database with real-time capabilities for storing off-chain data and indexing on-chain events
- **Smart Contract Integration**: Custom TypeScript interfaces for type-safe interaction with the StageDotFunPool contracts on Monad's high-performance EVM, optimized for low-latency transactions and efficient gas usage
- **Deployment & Infrastructure**: Vercel for seamless deployment, edge functions, and global CDN

This stack enables a responsive, user-friendly dApp that balances on-chain functionality with off-chain performance. The combination of Privy for authentication, Wagmi/Viem for blockchain interactions, and Supabase for data persistence creates a seamless experience that works well with Monad's high-performance EVM.

### Blockchain Integration

StageFun is integrated with the Monad blockchain, a high-performance Ethereum-compatible L1 that offers 10,000 transactions per second. The integration includes:

The project consists of three main smart contracts:

- StageDotFunPoolFactory: A factory contract that deploys new funding pools using CREATE2 for deterministic addresses. It maintains a registry of all deployed pools and provides methods to query pool details with efficient pagination.
- StageDotFunPool: Individual funding pools that manage deposits, revenue distribution, and milestone-based withdrawals. Each pool has its own ERC20 LP token for tracking contributions.
- StageDotFunLiquidity: ERC20 LP token for pool holders

Core Functionality
The StageDotFunPool contract implements a funding pool where users deposit USDC and receive LP tokens proportional to their contribution. Deposits are tracked with the totalDeposits state variable, with a minimum commitment threshold enforced to prevent dust deposits.

LP tokens are minted 1:1 with USDC deposits (6 decimal places). Each pool creates its own ERC20-compliant LP token that is fully transferable, allowing secondary market trading. These tokens represent proportional ownership of both the deposited capital and future revenue, with customizable token symbol and name per pool.

The pool can receive revenue which is tracked via the revenueAccumulated state variable and distributed to LP token holders. Distribution is proportional to LP token holdings, with the distributeRevenue() function calculating and distributing earnings to all participants.

## Getting Started

### Prerequisites

- Node.js and npm
- Supabase account
- Privy account
- Monad wallet with testnet tokens

### Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Set up environment variables in `.env.local`:

   ```
   # Supabase
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

   # Privy
   NEXT_PUBLIC_PRIVY_APP_ID=your_privy_app_id

   # Blockchain Configuration
   BLOCKCHAIN_PRIVATE_KEY=your_private_key
   MONAD_TESTNET_RPC_URL=https://testnet-rpc.monad.xyz
   NEXT_PUBLIC_BLOCKCHAIN_NETWORK=monad
   NEXT_PUBLIC_BLOCKCHAIN_EXPLORER=https://testnet.monadexplorer.com
   ```

4. Deploy the contracts to Monad:

   ```bash
   ./scripts/deploy-to-monad.sh
   ```

5. Start the development server:
   ```bash
   npm run dev
   ```

## Database Setup

1. Initialize Supabase:

   ```bash
   npm run db:start
   ```

2. Apply migrations:
   ```bash
   npm run db:push
   ```

## Deployment

To deploy to production:

1. Build the application:

   ```bash
   npm run build
   ```

2. Deploy to Vercel

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.
