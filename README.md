# StageFun - Party Rounds on Monad

StageFun is a decentralized platform for creating and managing party rounds for events, built on the Monad blockchain. It enables event and venue organizers to create funding pools with specific targets, allows investors and liquidty providers to commit funds, and provides a transparent mechanism for milestone-based fund distribution.

## Table of Contents

- [Features](#features)
- [System Architecture](#system-architecture)
- [Technical Implementation](#technical-implementation)
- [Design Choices](#design-choices)
- [API Documentation](#api-documentation)
- [Getting Started](#getting-started)
- [Deployment Guide](#deployment-guide)
- [Contributing](#contributing)

## Features

- Create party rounds with funding goals and deadlines
- Commit funds to pools with minimum commitment thresholds
- Receive LP tokens and patron passes as proof of contribution
- Track pool progress and status in real-time
- Milestone-based fund distribution with approval mechanisms
- Revenue sharing among pool participants
- Blockchain integration with Monad for high-performance transactions

## System Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                           Client Browser                            │
└───────────────────────────────────┬─────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│                         Next.js Frontend (Vercel)                   │
│                                                                     │
│  ┌─────────────────┐    ┌─────────────────-┐                        │
│  │     React UI    │    │   SWR Management |                        │
│  └─────────────────┘    └─────────────────-┘                        │
│                                                                     │
│  ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐  │
│  │  Wagmi/Viem     │    │  API Routes     │    │  Supabase SDK   │  │
│  │  Blockchain     │    │  (Next.js)      │    │  Integration    │  │
│  │  Integration    │    │                 │    │                 │  │
│  └────────┬────────┘    └───────┬─-───────┘    └──────┬─--───────┘  │
└───────────┼─────────────────────┼─────────────────────┼─────────────┘
            │                     │                     │
            ▼                     │                     ▼
┌───────────────────────┐         │           ┌─────────────────────┐
│   Monad Blockchain    │         │           │  Supabase Database  │
│                       │         │           │                     │
│  ┌─────────────────┐  │         │           │ ┌─────────────────┐ │
│  │StageDotFunPool  │  │         │           │ │    Pools        │ │
│  │Factory Contract │  │         │           │ │    Table        │ │
│  └────────┬────────┘  │         │           │ └─────────────────┘ │
│           │           │         │           │                     │
│           ▼           │         │           │ ┌─────────────────┐ │
│  ┌─────────────────┐  │         └──────────►│ │  Commitments    │ │
│  │StageDotFunPool  │  │         |           │ │  Table          │ │
│  │Contracts        │◄─┼─────────|           | └─────────────────┘ │
│  └────────┬────────┘  │                     │                     │
│           │           │                     │ ┌─────────────────┐ │
│           ▼           │                     │ │   Users         │ │
│  ┌─────────────────┐  │                     │ │   Table         │ │
│  │StageDotFunLiquidity│                     │ └─────────────────┘ │
│  │Token Contracts  │  │                     │                     │
│  └─────────────────┘  │                     │ ┌─────────────────┐ │
│                       │                     │ │   Events        │ │
└───────────────────────┘                     │ │   Table         │ │
                                              │ └─────────────────┘ │
                                              └─────────────────────┘
```

### Architecture Components

1. **Frontend Layer**:

   - Next.js application deployed on Vercel
   - React components for UI rendering
   - SWR for state management
   - Privy for Web3 authentication
   - Wagmi/Viem for blockchain interactions

2. **Backend Layer**:

   - Next.js API routes for server-side operations
   - Supabase for off-chain data storage and real-time updates
   - Blockchain integration via TypeScript interfaces

3. **Blockchain Layer**:

   - Monad blockchain for high-performance transactions
   - Smart contracts for pool management and token distribution
   - ERC20 LP tokens for tracking contributions

4. **Data Storage Layer**:
   - Supabase PostgreSQL database for off-chain data
   - On-chain storage for critical financial data
   - Real-time synchronization between on-chain and off-chain data

## Technical Implementation

### Smart Contract Architecture

The project consists of three main smart contracts:

1. **StageDotFunPoolFactory**: A factory contract that deploys new funding pools using CREATE2 for deterministic addresses. It maintains a registry of all deployed pools and provides methods to query pool details with efficient pagination.

2. **StageDotFunPool**: Individual funding pools that manage deposits, revenue distribution, and milestone-based withdrawals. Each pool has its own ERC20 LP token for tracking contributions.

3. **StageDotFunLiquidity**: ERC20 LP token for pool holders, implementing the standard ERC20 interface with additional minting and burning capabilities controlled by the pool contract.

### Core Functionality

The StageDotFunPool contract implements a funding pool where users deposit USDC and receive LP tokens proportional to their contribution. Key features include:

- **Deposit Tracking**: Deposits are tracked with the `totalDeposits` state variable, with a minimum commitment threshold enforced to prevent dust deposits.

- **LP Token Issuance**: LP tokens are minted 1:1 with USDC deposits (6 decimal places). Each pool creates its own ERC20-compliant LP token that is fully transferable, allowing secondary market trading.

- **Revenue Distribution**: The pool can receive revenue which is tracked via the `revenueAccumulated` state variable and distributed to LP token holders. Distribution is proportional to LP token holdings.

- **Milestone Management**: Funds are released to creators based on predefined milestones. Each milestone includes a description, amount, unlock time, and approval status.

- **Emergency Controls**: The contract includes emergency withdrawal mechanisms with time-locked safety features to protect user funds in case of critical issues.

### Frontend Implementation

The frontend is built with Next.js and React, providing a responsive and user-friendly interface. Key components include:

- **Authentication**: Privy integration for Web3 authentication, supporting both wallet-based and email-based login.

- **Pool Management**: UI components for creating, viewing, and managing pools, with real-time updates via Supabase subscriptions.

- **Blockchain Interaction**: Wagmi hooks and Viem for type-safe contract interactions, with proper error handling and transaction status tracking.

- **State Management**: Combination of SWR for data fetching and Zustand for global state management.

### Data Synchronization

The application maintains data consistency between on-chain and off-chain storage:

1. **On-Chain Data**: Critical financial information (deposits, withdrawals, token balances) is stored on the blockchain.

2. **Off-Chain Data**: Metadata, user profiles, and indexing information are stored in Supabase.

3. **Synchronization**: Backend processes monitor blockchain events and update the database accordingly, ensuring data consistency.

## Design Choices

### Why Monad Blockchain?

We chose Monad as our blockchain platform for several key reasons:

1. **High Performance**: Monad's architecture enables up to 10,000 transactions per second, providing a responsive user experience even during high traffic periods.

2. **EVM Compatibility**: Monad is fully compatible with the Ethereum Virtual Machine, allowing us to leverage existing Solidity development tools and libraries. The team has extensive experience with EVM, including our previous event managment platform that we plan to add deep integration with. Onchain events through Blocklive ported to Monad will payback funded pools in StageFun.

3. **Low Latency**: Monad's optimized consensus mechanism results in sub-second block times, enabling near-instant transaction confirmations.

4. **Cost Efficiency**: Lower gas fees compared to Ethereum mainnet make micro-transactions viable, which is essential for our use case.

5. **Developer Experience**: Monad provides robust developer tools and documentation, accelerating our development process.

### Architecture Decisions

1. **Next.js + React**: We chose Next.js for its server-side rendering capabilities, which improve initial load times and SEO. React's component-based architecture enables modular development and code reuse.

2. **Privy for Authentication**: Privy provides a seamless authentication experience for both crypto-native and non-crypto users, supporting wallet-based and email-based login flows.

3. **Supabase for Off-Chain Storage**: We selected Supabase for its PostgreSQL database with real-time capabilities, which allows us to efficiently store and query off-chain data while providing real-time updates to users.

4. **Wagmi/Viem for Blockchain Interaction**: These libraries provide type-safe contract interactions and React hooks, reducing the risk of errors and improving developer productivity.

5. **Factory Pattern for Contracts**: The factory pattern allows us to deploy multiple pool contracts with deterministic addresses, simplifying contract management and enabling efficient querying.

6. **LP Token Model**: We implemented a separate ERC20 token for each pool to represent contributions, enabling transferability and potential secondary market trading.

### Technical Trade-offs

1. **On-Chain vs. Off-Chain Data**: We store critical financial data on-chain for security and transparency, while keeping metadata off-chain to reduce gas costs and improve performance.

2. **CREATE2 for Deterministic Addresses**: Using CREATE2 for contract deployment enables deterministic addresses, making it easier to verify contract deployments and interact with pools.

3. **Milestone-Based Fund Release**: We implemented a milestone-based fund release mechanism to balance creator flexibility with contributor protection.

4. **Emergency Controls**: We added emergency withdrawal mechanisms with time locks to protect user funds in case of critical issues, balancing security with usability.

## API Documentation

### Smart Contract Interfaces

#### StageDotFunPoolFactory

```solidity
// Create a new funding pool
function createPool(
    string memory name,
    string memory uniqueId,
    string memory symbol,
    uint256 endTime,
    uint256 targetAmount,
    uint256 minCommitment
) external onlyOwner returns (address);

// Get all deployed pools
function getDeployedPools() external view returns (address[] memory);

// Get pool count
function getPoolCount() external view returns (uint256);

// Get pools with pagination
function getPools(uint256 start, uint256 limit) external view returns (address[] memory);
```

#### StageDotFunPool

```solidity
// Deposit funds into the pool
function deposit(uint256 amount) external;

// Withdraw funds (only available in specific conditions)
function withdraw(uint256 amount) external;

// Add a milestone
function addMilestone(string memory description, uint256 amount, uint256 unlockTime) external onlyOwner;

// Approve a milestone
function approveMilestone(uint256 milestoneIndex) external;

// Release funds for an approved milestone
function releaseMilestone(uint256 milestoneIndex) external;

// Distribute revenue to LP token holders
function distributeRevenue() external;

// Get pool status
function getStatus() external view returns (PoolStatus);

// Get milestone count
function getMilestoneCount() external view returns (uint256);

// Request emergency withdrawal
function requestEmergencyWithdrawal() external onlyOwner;

// Execute emergency withdrawal after delay
function executeEmergencyWithdrawal() external;
```

### Frontend API Routes

#### Pool Management

```typescript
// GET /api/pools
// Returns a list of all pools with pagination
// Query parameters: page, limit

// GET /api/pools/:id
// Returns details for a specific pool
// Path parameters: id (pool unique ID)

// POST /api/pools
// Creates a new pool (requires authentication)
// Body: { name, description, targetAmount, endTime, minCommitment }

// GET /api/pools/:id/commitments
// Returns all commitments for a specific pool
// Path parameters: id (pool unique ID)
// Query parameters: page, limit
```

#### User Management

```typescript
// GET /api/users/:address
// Returns user profile information
// Path parameters: address (user wallet address)

// GET /api/users/:address/commitments
// Returns all commitments made by a user
// Path parameters: address (user wallet address)
// Query parameters: page, limit
```

## Getting Started

### Prerequisites

- Node.js (v18+) and npm
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

4. Initialize the database:

   ```bash
   npm run db:start
   npm run db:push
   ```

5. Start the development server:
   ```bash
   npm run dev
   ```

## Deployment Guide

### Smart Contract Deployment

1. Compile the contracts:

   ```bash
   npm run compile
   ```

2. Deploy the contracts to Monad Testnet:

   ```bash
   npm run deploy:monad-testnet
   ```

3. Update the contract addresses in `src/lib/contracts/addresses.ts`:

   ```typescript
   export const CONTRACT_ADDRESSES = {
     monadTestnet: {
       stageDotFunPoolFactory: "0x591697DfC15bbAFb1930E4Ae5c187e55c153d623", // Replace with your deployed address
       usdc: "0xf817257fed379853cDe0fa4F97AB987181B1E5Ea",
     },
   };
   ```

### Frontend Deployment

1. Build the application:

   ```bash
   npm run build
   ```

2. Deploy to Vercel:

   ```bash
   vercel --prod
   ```

   Alternatively, you can connect your GitHub repository to Vercel for automatic deployments.

### Database Setup

1. Create a new Supabase project

2. Apply the database schema:

   ```bash
   supabase db push
   ```

3. Set up database functions and triggers:

   ```bash
   psql -h your_supabase_host -d postgres -U postgres -f setup.sql
   ```

### Post-Deployment Verification

1. Verify the smart contracts on Monad Explorer:

   - Visit https://testnet.monadexplorer.com
   - Search for your contract addresses
   - Verify the contract source code

2. Test the application flow:
   - Create a new pool
   - Make a deposit
   - Verify LP token receipt
   - Test milestone creation and approval

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.
