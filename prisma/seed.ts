import * as dotenv from 'dotenv'
dotenv.config()

import { PrismaClient } from '@prisma/client'
import { PrismaNeon } from '@prisma/adapter-neon'
import { Pool, neonConfig } from '@neondatabase/serverless'

// @ts-ignore
import ws from 'ws'

neonConfig.webSocketConstructor = ws

const prisma = new PrismaClient({
  // @ts-ignore
  adapter: new PrismaNeon(new Pool({ connectionString: process.env.DATABASE_URL })),
})

async function main() {
  console.log('Seeding database...')

  await prisma.warehouse.upsert({
    where: { id: 'wh-1' },
    update: {},
    create: { id: 'wh-1', name: 'Mumbai Warehouse', location: 'Mumbai, India' },
  })

  await prisma.warehouse.upsert({
    where: { id: 'wh-2' },
    update: {},
    create: { id: 'wh-2', name: 'Delhi Warehouse', location: 'Delhi, India' },
  })

  await prisma.product.upsert({
    where: { id: 'prod-1' },
    update: {},
    create: {
      id: 'prod-1',
      name: 'Wireless Headphones',
      description: 'Premium noise-cancelling wireless headphones',
      price: 2999,
      imageUrl: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400',
    },
  })

  await prisma.product.upsert({
    where: { id: 'prod-2' },
    update: {},
    create: {
      id: 'prod-2',
      name: 'Mechanical Keyboard',
      description: 'RGB mechanical keyboard with Cherry MX switches',
      price: 4999,
      imageUrl: 'https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=400',
    },
  })

  await prisma.product.upsert({
    where: { id: 'prod-3' },
    update: {},
    create: {
      id: 'prod-3',
      name: 'Smart Watch',
      description: 'Feature-packed smartwatch with health tracking',
      price: 8999,
      imageUrl: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400',
    },
  })

  await prisma.stockLevel.upsert({
    where: { productId_warehouseId: { productId: 'prod-1', warehouseId: 'wh-1' } },
    update: {},
    create: { productId: 'prod-1', warehouseId: 'wh-1', total: 10, reserved: 0 },
  })

  await prisma.stockLevel.upsert({
    where: { productId_warehouseId: { productId: 'prod-1', warehouseId: 'wh-2' } },
    update: {},
    create: { productId: 'prod-1', warehouseId: 'wh-2', total: 5, reserved: 0 },
  })

  await prisma.stockLevel.upsert({
    where: { productId_warehouseId: { productId: 'prod-2', warehouseId: 'wh-1' } },
    update: {},
    create: { productId: 'prod-2', warehouseId: 'wh-1', total: 8, reserved: 0 },
  })

  await prisma.stockLevel.upsert({
    where: { productId_warehouseId: { productId: 'prod-2', warehouseId: 'wh-2' } },
    update: {},
    create: { productId: 'prod-2', warehouseId: 'wh-2', total: 3, reserved: 0 },
  })

  await prisma.stockLevel.upsert({
    where: { productId_warehouseId: { productId: 'prod-3', warehouseId: 'wh-1' } },
    update: {},
    create: { productId: 'prod-3', warehouseId: 'wh-1', total: 2, reserved: 0 },
  })

  await prisma.stockLevel.upsert({
    where: { productId_warehouseId: { productId: 'prod-3', warehouseId: 'wh-2' } },
    update: {},
    create: { productId: 'prod-3', warehouseId: 'wh-2', total: 6, reserved: 0 },
  })

  console.log('✅ Seeding complete!')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })