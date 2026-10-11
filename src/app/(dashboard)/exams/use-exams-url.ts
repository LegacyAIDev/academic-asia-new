"use client"

import { useEffect, useRef, useTransition } from "react"
import { useRouter, useSearchParams } from "next/navigation"

export type ExamsUrlUpdate = (updates: Record<string, string | null>) => void

/**
 * Writes exam page filters into the URL. Changing a filter always goes back to
 * the first page, and the scroll position is kept so the list does not jump.
 */
export function useExamsUrl() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()

  // The query most recently asked for. Until the router has caught up, the next
  // change builds on it rather than on the address still on screen; otherwise a
  // second filter chosen while the first is loading would quietly undo the first.
  // It is forgotten as soon as nothing is loading any more, whatever page that led to.
  const requested = useRef<string | null>(null)
  useEffect(() => {
    if (!isPending) requested.current = null
  }, [isPending, searchParams])

  const push = (params: URLSearchParams) => {
    const query = params.toString()
    requested.current = query
    startTransition(() => router.push(query ? `/exams?${query}` : "/exams", { scroll: false }))
  }

  /** Sets the given parameters; `null` or an empty string removes one. */
  const update: ExamsUrlUpdate = updates => {
    const params = new URLSearchParams(requested.current ?? searchParams.toString())
    for (const [key, value] of Object.entries(updates)) {
      if (value) params.set(key, value)
      else params.delete(key)
    }
    params.delete("page")
    push(params)
  }

  /** Clears every filter but stays on the current view. */
  const reset = () => {
    const params = new URLSearchParams()
    const view = searchParams.get("view")
    if (view) params.set("view", view)
    push(params)
  }

  return { update, reset, isPending }
}
