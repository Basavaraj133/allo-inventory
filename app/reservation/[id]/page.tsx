'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from 'sonner'

interface Reservation {
  id: string
  quantity: number
  status: 'PENDING' | 'CONFIRMED' | 'RELEASED'
  expiresAt: string
  product: { name: string; price: number; imageUrl: string }
  warehouse: { name: string; location: string }
}

export default function ReservationPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [reservation, setReservation] = useState<Reservation | null>(null)
  const [timeLeft, setTimeLeft] = useState<number>(0)
  const [loading, setLoading] = useState(true)
  const [acting, setActing] = useState(false)

  useEffect(() => {
    fetch(`/api/reservations/${id}`)
      .then((r) => r.json())
      .then((data) => { setReservation(data); setLoading(false) })
  }, [id])

  useEffect(() => {
    if (!reservation || reservation.status !== 'PENDING') return
    const interval = setInterval(() => {
      const left = Math.max(0, new Date(reservation.expiresAt).getTime() - Date.now())
      setTimeLeft(left)
      if (left === 0) clearInterval(interval)
    }, 1000)
    return () => clearInterval(interval)
  }, [reservation])

  const handleConfirm = useCallback(async () => {
    setActing(true)
    try {
      const res = await fetch(`/api/reservations/${id}/confirm`, { method: 'POST' })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error || 'Failed to confirm')
        if (res.status === 410) setReservation((r) => r ? { ...r, status: 'RELEASED' } : r)
        return
      }
      toast.success('Purchase confirmed! 🎉')
      setReservation(data)
    } finally {
      setActing(false)
    }
  }, [id])

  const handleCancel = useCallback(async () => {
    setActing(true)
    try {
      const res = await fetch(`/api/reservations/${id}/release`, { method: 'POST' })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error || 'Failed to cancel')
        return
      }
      toast.success('Reservation cancelled')
      setReservation(data)
    } finally {
      setActing(false)
    }
  }, [id])

  const formatTime = (ms: number) => {
    const mins = Math.floor(ms / 60000)
    const secs = Math.floor((ms % 60000) / 1000)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Loading reservation...</p>
      </div>
    )
  }

  if (!reservation) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-destructive">Reservation not found</p>
      </div>
    )
  }

  const statusColor = {
    PENDING: 'default',
    CONFIRMED: 'default',
    RELEASED: 'destructive',
  } as const

  return (
    <main className="min-h-screen bg-background">
      <div className="max-w-lg mx-auto px-4 py-12">
        <Button variant="ghost" className="mb-6" onClick={() => router.push('/')}>
          ← Back to products
        </Button>
        <Card>
          <img
            src={reservation.product.imageUrl}
            alt={reservation.product.name}
            className="w-full h-56 object-cover rounded-t-lg"
          />
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>{reservation.product.name}</CardTitle>
              <Badge variant={statusColor[reservation.status]}>
                {reservation.status}
              </Badge>
            </div>
            <p className="text-muted-foreground text-sm">{reservation.warehouse.name} — {reservation.warehouse.location}</p>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Quantity</span>
              <span className="font-medium">{reservation.quantity}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Total</span>
              <span className="font-bold text-lg">₹{(reservation.product.price * reservation.quantity).toLocaleString()}</span>
            </div>

            {reservation.status === 'PENDING' && (
              <div className={`text-center p-4 rounded-lg ${timeLeft < 60000 ? 'bg-destructive/10' : 'bg-muted'}`}>
                <p className="text-sm text-muted-foreground mb-1">Reservation expires in</p>
                <p className={`text-3xl font-mono font-bold ${timeLeft < 60000 ? 'text-destructive' : ''}`}>
                  {formatTime(timeLeft)}
                </p>
              </div>
            )}

            {reservation.status === 'CONFIRMED' && (
              <div className="text-center p-4 rounded-lg bg-green-500/10">
                <p className="text-green-600 font-semibold text-lg">✅ Purchase Confirmed!</p>
                <p className="text-sm text-muted-foreground mt-1">Your order has been placed successfully</p>
              </div>
            )}

            {reservation.status === 'RELEASED' && (
              <div className="text-center p-4 rounded-lg bg-destructive/10">
                <p className="text-destructive font-semibold">Reservation Cancelled or Expired</p>
                <Button className="mt-3" onClick={() => router.push('/')}>Browse products</Button>
              </div>
            )}

            {reservation.status === 'PENDING' && (
              <div className="flex gap-3">
                <Button
                  className="flex-1"
                  onClick={handleConfirm}
                  disabled={acting || timeLeft === 0}
                >
                  {acting ? 'Processing...' : 'Confirm Purchase'}
                </Button>
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={handleCancel}
                  disabled={acting}
                >
                  Cancel
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  )
}