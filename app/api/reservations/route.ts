import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { redis } from '@/lib/redis'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

const reserveSchema = z.object({
  productId: z.string(),
  warehouseId: z.string(),
  quantity: z.number().int().positive(),
})

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { productId, warehouseId, quantity } = reserveSchema.parse(body)

    const lockKey = `lock:${productId}:${warehouseId}`
    const lockValue = crypto.randomUUID()
    const lockAcquired = await redis.set(lockKey, lockValue, {
      nx: true,
      ex: 10,
    })

    if (!lockAcquired) {
      return NextResponse.json(
        { error: 'Another reservation is in progress. Please try again.' },
        { status: 409 }
      )
    }

    try {
      const stockLevel = await prisma.stockLevel.findUnique({
        where: {
          productId_warehouseId: { productId, warehouseId },
        },
      })

      if (!stockLevel) {
        return NextResponse.json({ error: 'Stock not found' }, { status: 404 })
      }

      const available = stockLevel.total - stockLevel.reserved
      if (available < quantity) {
        return NextResponse.json(
          { error: 'Not enough stock available' },
          { status: 409 }
        )
      }

      const expiresAt = new Date(Date.now() + 10 * 60 * 1000)

      const [reservation] = await prisma.$transaction([
        prisma.reservation.create({
          data: {
            productId,
            warehouseId,
            quantity,
            expiresAt,
            status: 'PENDING',
          },
          include: {
            product: true,
            warehouse: true,
          },
        }),
        prisma.stockLevel.update({
          where: {
            productId_warehouseId: { productId, warehouseId },
          },
          data: {
            reserved: { increment: quantity },
          },
        }),
      ])

      return NextResponse.json(reservation, { status: 201 })
    } finally {
      const currentValue = await redis.get(lockKey)
      if (currentValue === lockValue) {
        await redis.del(lockKey)
      }
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 })
    }
    return NextResponse.json({ error: 'Failed to create reservation' }, { status: 500 })
  }
}
