import { PrismaClient } from '@prisma/client'
import { PrismaNeon } from '@prisma/adapter-neon'
import { Pool, neonConfig } from '@neondatabase/serverless'
// @ts-ignore
import ws from 'ws'

neonConfig.webSocketConstructor = ws
neonConfig.poolQueryViaFetch = true

const connectionString = "postgresql://neondb_owner:npg_RWbKc06yvQng@ep-odd-frog-aoxns2ov-pooler.c-2.ap-southeast-1.aws.neon.tech/neondb?sslmode=require"

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

function createPrismaClient() {
  const pool = new Pool({ connectionString })
  const adapter = new PrismaNeon(pool)
  return new PrismaClient({ adapter })
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma