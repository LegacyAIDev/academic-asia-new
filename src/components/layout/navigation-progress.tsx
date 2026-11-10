"use client"

import { useEffect, useMemo, useState } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"

/** Gives up waiting after this long, so a failed navigation never leaves the bar running. */
const MAX_MS = 20000
const START_EVENT = "app:navigation-start"

/** Starts the bar, unless `href` is the address already showing (nothing will load). */
function startFor(href: string) {
  const url = new URL(href, window.location.href)
  if (url.pathname === window.location.pathname && url.search === window.location.search) return
  window.dispatchEvent(new Event(START_EVENT))
}

/** The app router, with push and replace also starting the loading bar (filters, redirects after a save). */
export function useRouterWithProgress() {
  const router = useRouter()
  return useMemo(() => ({
    ...router,
    push: (...args: Parameters<typeof router.push>) => {
      startFor(args[0])
      router.push(...args)
    },
    replace: (...args: Parameters<typeof router.replace>) => {
      startFor(args[0])
      router.replace(...args)
    },
  }), [router])
}

/**
 * A thin bar across the top while the next page, tab or filter result loads
 * from the server. It starts when an in-app link is clicked or a filter or
 * save navigates (useRouterWithProgress), and stops once the address changes. Page loads also show the loading screen; this covers
 * changes within a page (tabs, filters) that keep the current view on screen.
 */
export function NavigationProgress() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const location = `${pathname}?${searchParams.toString()}`
  const [active, setActive] = useState(false)
  const [shownFor, setShownFor] = useState(location)

  // The address changed: the new view has arrived.
  if (shownFor !== location) {
    setShownFor(location)
    setActive(false)
  }

  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      // Listening in the capture phase: next/link cancels the browser's own navigation on the way back up.
      if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
      const link = (event.target as Element | null)?.closest?.("a[href]") as HTMLAnchorElement | null
      if (!link || (link.target && link.target !== "_self") || link.hasAttribute("download")) return
      const url = new URL(link.href, window.location.href)
      if (url.origin !== window.location.origin) return
      if (url.pathname === window.location.pathname && url.search === window.location.search) return
      setActive(true)
    }
    const onStart = () => setActive(true)
    document.addEventListener("click", onClick, true)
    window.addEventListener(START_EVENT, onStart)
    return () => {
      document.removeEventListener("click", onClick, true)
      window.removeEventListener(START_EVENT, onStart)
    }
  }, [])

  useEffect(() => {
    if (!active) return
    const timer = setTimeout(() => setActive(false), MAX_MS)
    return () => clearTimeout(timer)
  }, [active])

  if (!active) return null
  return (
    <div role="progressbar" aria-label="Loading" className="fixed inset-x-0 top-0 z-[100] h-0.5 overflow-hidden bg-primary/20 print:hidden">
      <div className="h-full w-1/3 bg-primary animate-[nav-progress_1.1s_ease-in-out_infinite] motion-reduce:w-full motion-reduce:animate-none" />
    </div>
  )
}
