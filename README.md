# StageFun - Party Rounds on Monad

StageFun is a decentralized platform for creating and managing party rounds for events, built on the Monad blockchain.

## Features

- Create party rounds with funding goals
- Commit funds to pools
- Receive tokens and patron passes
- Track pool progress and status
- Blockchain integration with Monad

## Blockchain Integration

StageFun is integrated with the Monad blockchain, a high-performance Ethereum-compatible L1 that offers 10,000 transactions per second. The integration includes:

- Smart contracts for pool creation and commitments
- Backend API for blockchain interactions
- Transaction tracking and status updates
- Explorer links for transparency

For detailed deployment instructions, see [MONAD_DEPLOYMENT.md](./MONAD_DEPLOYMENT.md).

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

2. Deploy to your hosting provider of choice.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the LICENSE file for details.
