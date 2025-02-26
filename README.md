# Party Rounds App

A web application for creating and participating in funding pools.

## Setup

1. Clone the repository
2. Install dependencies:
   ```
   npm install
   ```
3. Install Supabase CLI:
   ```
   brew install supabase/tap/supabase
   ```
4. Create a `.env.local` file with the following variables:
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
   NEXT_PUBLIC_PRIVY_APP_ID=your-privy-app-id
   ```
5. Apply the database schema:
   ```
   npm run apply-schema
   ```
6. Start the development server:
   ```
   npm run dev
   ```

## Database Management

This project uses Supabase CLI for database management:

- Apply migrations: `npm run db:push`
- Reset database: `npm run db:reset`
- Create a new migration: `npm run db:diff`

## Database Structure

The application uses Supabase as its database with the following tables:

- **users**: Stores user information
- **pools**: Stores pool/round information
- **patrons**: Stores commitments from users to pools

## Features

- User authentication via Privy
- Create funding pools with customizable parameters
- Browse open pools
- Commit funds to pools
- View pool details and participants
