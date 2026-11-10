'use client'

import { useCallback, useState } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'

/**
 * Open state for an "add" pop-up that a link can open: `?add=<key>` opens the
 * pop-up whose key matches, on arrival or while already on the page, and
 * closing it takes the parameter back off the address. Pass null for a pop-up
 * no link opens (editing an existing record).
 */
export function useAddParam(key: string | null) {
  const searchParams = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()
  const asked = key !== null && searchParams.get('add') === key
  const [open, setOpenState] = useState(asked)
  // Adjust during render (not in an effect) when a link asks again while mounted.
  const [answered, setAnswered] = useState(asked)
  if (asked && !answered) {
    setAnswered(true)
    setOpenState(true)
  } else if (!asked && answered) {
    setAnswered(false)
  }

  const setOpen = useCallback((next: boolean) => {
    setOpenState(next)
    if (!next && key !== null && searchParams.get('add') === key) {
      const params = new URLSearchParams(searchParams.toString())
      params.delete('add')
      const query = params.toString()
      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false })
    }
  }, [key, pathname, router, searchParams])

  return [open, setOpen] as const
}
