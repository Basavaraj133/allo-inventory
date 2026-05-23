import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const products = await prisma.product.findMany({
      include: {
        stockLevels: {
          include: {
            warehouse: true,
          },
        },
      },
    })
    return NextResponse.json(products)
  } catch (error) {
    console.error('PRODUCTS ERROR:', error)
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
