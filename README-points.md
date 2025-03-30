# Stage.fun Points System

This document outlines the points system architecture and security approach implemented for the Stage.fun platform.

## Overview

The points system allows users to:

- Claim daily points (1000 pts) once every 24 hours
- Track and build streaks for consecutive daily check-ins
- View their total points and time until next claim

The system is designed to be secure, scalable, and maintainable, with clear separation of concerns.

## Security Architecture

We've implemented a security-first approach:

1. **Row Level Security (RLS)**

   - Tables are completely locked down with `USING (false)` policies
   - No direct access to points tables from client-side
   - All access must go through secure API endpoints with service role key

2. **Backend API Security**

   - API endpoints use Privy JWT for authentication
   - Supabase service role key is used server-side only
   - All database operations happen in secure backend API routes

3. **Transactional Integrity**
   - Backend API handles transaction logic
   - Multiple related operations are performed sequentially with proper error handling
   - Clear error messages for better debugging

## Database Schema

The system uses three tables:

### `user_points`

- Stores the total points for each user
- One record per user with a running total

### `point_transactions`

- Records every points operation (earning, spending)
- Maintains an audit trail with timestamps and metadata
- Supports future analytics and reporting

### `daily_checkins`

- Tracks streak information and claim timing
- Enforces 24-hour cooldown between claims
- Stores next available claim time

## API Endpoints

Secure API routes that authenticate users and process points operations:

1. `GET /api/points/user-data` - Retrieves a user's points and check-in status
2. `POST /api/points/daily-claim` - Claims daily points reward

Each endpoint:

- Validates the user's Privy JWT
- Uses the service role key to bypass RLS
- Implements proper error handling and response formatting

## Frontend Components

1. `DailyCheckin.tsx` - UI component for the daily claim button
2. `usePoints.ts` - React hook that provides points functionality to components

## Future Extensions

The system is designed to be easily extended for:

1. Account setup points (follow on Twitter, connect wallet)
2. Leaderboard implementation
3. Points for pool creation and contribution
4. Rewards/achievements system
5. Points expiry and seasonal resets

## Usage

```tsx
// Use the points hook in any component
const {
  points,
  streakCount,
  canClaim,
  formattedTimeRemaining,
  claimDailyPoints,
} = usePoints();

// Render the daily check-in component
<DailyCheckin />;
```

## Security Best Practices

1. Never expose the service role key to the client
2. Always validate user authentication in API routes
3. Use the principle of least privilege for all operations
4. Thoroughly test for possible ways to game the system
5. Maintain a complete audit trail of all points operations

## Maintenance Advantages

By moving logic to the backend API instead of stored procedures:

1. Easier to maintain and debug (TypeScript vs. PLPGSQL)
2. Better version control and code review processes
3. Simpler to modify business logic
4. Easier to test with modern testing frameworks
5. Better developer experience with IDE support
