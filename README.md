# Allo Inventory

An inventory and order-fulfillment reservation platform built with Next.js, Prisma, Neon (Postgres), and Upstash (Redis).

## How to run locally

1. Clone the repo
2. Install dependencies:
   ```bash
   npm install
   ```
3. Set up environment variables in `.env`:
   ```env
   DATABASE_URL="your-neon-connection-string"
   UPSTASH_REDIS_REST_URL="your-upstash-url"
   UPSTASH_REDIS_REST_TOKEN="your-upstash-token"
   ```
4. Generate Prisma client:
   ```bash
   npx prisma generate
   ```
5. Run the development server:
   ```bash
   npm run dev
   ```
6. Open [http://localhost:3000](http://localhost:3000)

## How the expiry mechanism works

Reservations have an `expiresAt` timestamp set 10 minutes in the future. Expiry is handled via **lazy cleanup on read**: when a confirm or release request comes in, the server checks if `expiresAt < now()` and marks the reservation as RELEASED if so, freeing the stock. This is simple, reliable, and requires no background worker.

For production, a Vercel Cron Job (`/api/cron/expire`) running every minute would sweep for expired PENDING reservations and release them in bulk.

## Concurrency approach

When a reservation request comes in, we acquire a distributed Redis lock on `lock:{productId}:{warehouseId}` using `SET NX EX 10`. Only one request can hold the lock at a time. Once inside the lock, we check available stock and create the reservation atomically using a Prisma `$transaction`. The lock is released in a `finally` block. This guarantees exactly-one success when two requests race for the last unit.

## Trade-offs

- Used lazy expiry instead of a cron job for simplicity — a background sweeper would be cleaner in production
- No authentication — in production each reservation would be tied to a user session
- No idempotency keys implemented (bonus feature) — would use Redis to store request hash → response mapping
