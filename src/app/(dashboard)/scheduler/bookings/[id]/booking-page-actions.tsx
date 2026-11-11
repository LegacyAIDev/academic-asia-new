'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { MoreHorizontal, Pencil } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { BookingCancelDialog } from '@/components/scheduler/booking-cancel-dialog'

/** Edit (in the calendar's booking form) and Cancel, for someone who may change bookings. */
export function BookingPageActions({ bookingId, editHref }: { bookingId: string; editHref: string }) {
  const router = useRouter()
  const [cancelOpen, setCancelOpen] = useState(false)

  return (
    <>
      <Button asChild variant="ghost" size="sm" className="h-9">
        <Link href={editHref}><Pencil className="mr-1 h-3.5 w-3.5" /> Edit</Link>
      </Button>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button size="icon" variant="ghost" className="h-9 w-9" aria-label="More actions"><MoreHorizontal className="h-4 w-4" /></Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          <DropdownMenuItem className="text-destructive focus:text-destructive" onSelect={() => setCancelOpen(true)}>Cancel booking</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <BookingCancelDialog
        bookingId={bookingId}
        open={cancelOpen}
        onOpenChange={setCancelOpen}
        onCancelled={() => {
          setCancelOpen(false)
          router.refresh()
        }}
      />
    </>
  )
}
