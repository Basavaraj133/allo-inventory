'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from 'sonner'

interface StockLevel {
  id: string
  warehouseId: string
  total: number
  reserved: number
  warehouse: { id: string; name: string; location: string }
}

interface Product {
  id: string
  name: string
  description: string
  price: number
  imageUrl: string
  stockLevels: StockLevel[]
}

export default function Home() {
  const router = useRouter()
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [reserving, setReserving] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/products')
      .then((r) => r.json())
      .then((data) => { setProducts(Array.isArray(data) ? data : []); setLoading(false) })
  }, [])

  async function handleReserve(productId: string, warehouseId: string) {
    setReserving(`${productId}-${warehouseId}`)
    try {
      const res = await fetch('/api/reservations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId, warehouseId, quantity: 1 }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error || 'Failed to reserve')
        return
      }
      toast.success('Reserved! Redirecting to checkout...')
      router.push(`/reservation/${data.id}`)
    } catch {
      toast.error('Something went wrong')
    } finally {
      setReserving(null)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground text-lg">Loading products...</p>
      </div>
    )
  }

  return (
    <main className="min-h-screen bg-background">
      <div className="max-w-6xl mx-auto px-4 py-12">
        <div className="mb-10">
          <h1 className="text-4xl font-bold tracking-tight">Allo Inventory</h1>
          <p className="text-muted-foreground mt-2">Reserve products before they run out</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {products.map((product) => (
            <Card key={product.id} className="overflow-hidden">
              <img
                src={product.imageUrl}
                alt={product.name}
                className="w-full h-48 object-cover"
              />
              <CardHeader>
                <CardTitle>{product.name}</CardTitle>
                <p className="text-sm text-muted-foreground">{product.description}</p>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold mb-4">₹{product.price.toLocaleString()}</p>
                <div className="space-y-2">
                  {product.stockLevels.map((stock) => {
                    const available = stock.total - stock.reserved
                    return (
                      <div key={stock.id} className="flex items-center justify-between p-2 rounded-lg bg-muted">
                        <div>
                          <p className="text-sm font-medium">{stock.warehouse.name}</p>
                          <p className="text-xs text-muted-foreground">{stock.warehouse.location}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant={available > 0 ? 'default' : 'destructive'}>
                            {available > 0 ? `${available} left` : 'Out of stock'}
                          </Badge>
                          <Button
                            size="sm"
                            disabled={available === 0 || reserving === `${product.id}-${stock.warehouseId}`}
                            onClick={() => handleReserve(product.id, stock.warehouseId)}
                          >
                            {reserving === `${product.id}-${stock.warehouseId}` ? 'Reserving...' : 'Reserve'}
                          </Button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </main>
  )
}