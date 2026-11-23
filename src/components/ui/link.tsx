"use client"

import NextLink from "next/link"
import { useRouter } from "next/navigation"
import { useEffect, useRef, type ComponentProps, type FocusEvent, type MouseEvent } from "react"

type LinkProps = ComponentProps<typeof NextLink>

/** How long the pointer has to rest on a link before it is fetched, so sweeping across a table does not fetch every row. */
const HOVER_DELAY_MS = 80

/**
 * next/link that fetches its page when the pointer rests on it or it gets
 * keyboard focus, instead of as soon as it is on screen.
 *
 * Every page here is rendered per request, so Next's on-screen prefetch meant a
 * full server render for each visible link: the sidebar, every status tab and
 * page size, and every student row. One visit to the students list sent about
 * seventy requests, and a click had to wait behind them. Passing `prefetch`
 * explicitly keeps Next's own behaviour for that link.
 */
export default function Link({ prefetch, href, onMouseEnter, onMouseLeave, onFocus, ...props }: LinkProps) {
  const router = useRouter()
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const fetched = useRef(false)
  const onHover = prefetch === undefined || prefetch === null

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current) }, [])

  const warm = () => {
    if (fetched.current || typeof href !== "string") return
    fetched.current = true
    router.prefetch(href)
  }

  return (
    <NextLink
      {...props}
      href={href}
      prefetch={onHover ? false : prefetch}
      onMouseEnter={(event: MouseEvent<HTMLAnchorElement>) => {
        onMouseEnter?.(event)
        if (onHover && !fetched.current) timer.current = setTimeout(warm, HOVER_DELAY_MS)
      }}
      onMouseLeave={(event: MouseEvent<HTMLAnchorElement>) => {
        onMouseLeave?.(event)
        if (timer.current) clearTimeout(timer.current)
      }}
      onFocus={(event: FocusEvent<HTMLAnchorElement>) => {
        onFocus?.(event)
        if (onHover) warm()
      }}
    />
  )
}
