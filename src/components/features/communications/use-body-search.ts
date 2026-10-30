"use client"

import { useEffect, useRef, useState } from "react"
import { useDebouncedCallback } from "use-debounce"
import type { EmailContext } from "@/lib/emails/email-draft"
import { searchEmailBodies } from "@/lib/supabase/actions/filed-email-search"

const NONE: ReadonlySet<string> = new Set()

function targetOf(context: EmailContext) {
  if (context.kind === "student") return { kind: "student" as const, id: context.student.id }
  if (context.kind === "school") return { kind: "school" as const, id: context.school.id }
  return { kind: "application" as const, id: context.applicationId }
}

/**
 * Ids of emails whose full text matches the search box (EF-16), asked of the
 * server a moment after typing stops. An answer only counts for the text it
 * was asked for, so a slow reply never filters by an older search.
 */
export function useBodySearch(context: EmailContext, query: string): ReadonlySet<string> {
  const [result, setResult] = useState<{ query: string; ids: ReadonlySet<string> } | null>(null)
  const latest = useRef(0)
  const text = query.trim()
  const target = targetOf(context)

  const run = useDebouncedCallback(async (q: string, kind: typeof target.kind, id: string) => {
    const request = ++latest.current
    try {
      const found = await searchEmailBodies({ kind, id }, q)
      if (request === latest.current && found.success) setResult({ query: q, ids: new Set(found.data ?? []) })
    } catch {
      // Search of the full text is a bonus over the list's own search; on failure the list search still works.
    }
  }, 400)

  useEffect(() => {
    if (text.length >= 2) run(text, target.kind, target.id)
  }, [text, target.kind, target.id, run])

  return result && result.query === text ? result.ids : NONE
}
