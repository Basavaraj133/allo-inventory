# Allo Inventory — Reservation System

A Next.js inventory and order-fulfillment platform with race-condition-free stock reservations.

🔗 **Live demo:** https://allo-inventory-mu-eosin.vercel.app
📦 **Repository:** https://github.com/Basavaraj133/allo-inventory

## Stack

- **Next.js 16** (App Router) + TypeScript
- **Prisma 5** ORM + **Neon** (hosted Postgres)
- **Upstash Redis** for distributed locking
- **Tailwind CSS** + **shadcn/ui** for the frontend
- **Zod** for request validation
- **Sonner** for toast notifications

## Run locally

1. Clone the repo:
```bash
   git clone https://github.com/Basavaraj133/allo-inventory.git
   cd allo-inventory
```

2. Install dependencies:
```bash
   npm install
```

3. Create a `.env` file in the root:
```env
   DATABASE_URL="your-neon-postgres-url"
   UPSTASH_REDIS_REST_URL="your-upstash-url"
   UPSTASH_REDIS_REST_TOKEN="your-upstash-token"
```

4. Generate the Prisma client and run the dev server:
```bash
   npx prisma generate
   npm run dev
```

5. Open [http://localhost:3000](http://localhost:3000).

The database is already seeded with 3 products and 2 warehouses across 6 stock levels.

## API endpoints

| Method | Path | Behaviour |
|--------|------|-----------|
| GET | `/api/products` | List products with available stock per warehouse |
| GET | `/api/warehouses` | List warehouses |
| GET | `/api/reservations/:id` | Get a reservation |
| POST | `/api/reservations` | Create a reservation. Returns 409 if not enough stock |
| POST | `/api/reservations/:id/confirm` | Confirm a reservation. Returns 410 if expired |
| POST | `/api/reservations/:id/release` | Release a reservation early |

## How concurrency is handled

When a reservation request arrives, the server acquires a distributed Redis lock on `lock:{productId}:{warehouseId}` using `SET NX EX 10`. Only one request can hold the lock at a time. Inside the lock, available stock is read and the reservation is created atomically using `prisma.$transaction`. The lock is released in a `finally` block.

This guarantees exactly-one success when two requests race for the last unit — the loser gets a clean 409.

## How expiry works

I went with **lazy cleanup on read**: when a confirm request comes in, the server checks if `expiresAt < now()`. If it has expired, the reservation is marked `RELEASED` and the reserved stock is decremented before responding with 410. This is simple and requires no background worker.

For production, a Vercel Cron Job running every minute would sweep for expired `PENDING` reservations in bulk — but for the assignment scope, lazy cleanup is sufficient and correct.

## Trade-offs and things I'd do differently with more time

- **Lazy expiry vs background sweeper.** Lazy expiry only triggers on confirm — abandoned reservations sit as PENDING in the DB until either a confirm attempt or a manual sweeper runs. A Vercel Cron at `/api/cron/expire` would clean these up properly.
- **No idempotency keys.** The bonus wasn't implemented. The approach would be to hash the `Idempotency-Key` header + body, store the response in Redis with a short TTL, and return the cached response on retry.
- **No authentication.** Reservations aren't tied to a user — in production each one would be scoped to a session/user ID.
- **No tests.** Concurrency-critical code should have a load test (e.g., fire 100 concurrent reserves for 1 unit of stock and verify exactly 1 succeeds).
- **`force-dynamic` on every route.** Required for the App Router to read env vars and DB state at runtime. In production I'd be more deliberate about caching.