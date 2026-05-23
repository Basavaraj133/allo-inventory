import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const reservation = await prisma.reservation.findUnique({ where: { id } })

    if (!reservation) {
      return NextResponse.json({ error: 'Reservation not found' }, { status: 404 })
    }

    if (reservation.status !== 'PENDING') {
      return NextResponse.json({ error: 'Reservation is no longer pending' }, { status: 409 })
    }

    const [updated] = await prisma.$transaction([
      prisma.reservation.update({
        where: { id },
        data: { status: 'RELEASED' },
        include: { product: true, warehouse: true },
      }),
      prisma.stockLevel.update({
        where: { productId_warehouseId: { productId: reservation.productId, warehouseId: reservation.warehouseId } },
        data: { reserved: { decrement: reservation.quantity } },
      }),
    ])

    return NextResponse.json(updated)
  } catch (error) {
    return NextResponse.json({ error: 'Failed to release reservation' }, { status: 500 })
  }
}
