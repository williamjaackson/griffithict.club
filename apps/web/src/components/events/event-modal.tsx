'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import type { Event } from '@/lib/events'
import { Dialog, DialogClose, DialogTitle } from '@/components/ui/dialog'
import { EventDetail } from './event-detail'

export function EventModal({ event, discordUrl }: { event: Event; discordUrl: string }) {
  const router = useRouter()
  const [open, setOpen] = useState(true)

  function handleOpenChange(next: boolean) {
    setOpen(next)
    // Back rather than push, so closing returns to wherever the link was clicked
    // and the URL stops pointing at the event.
    if (!next) router.back()
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange} label={event.title}>
      <div className="flex justify-end">
        <DialogClose />
      </div>
      <EventDetail event={event} discordUrl={discordUrl} Title={DialogTitle} />
    </Dialog>
  )
}
