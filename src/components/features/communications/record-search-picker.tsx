"use client"

import { useRef, useState } from "react"
import { useDebouncedCallback } from "use-debounce"
import { Search, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Command, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import type { LinkedRecord } from "@/lib/emails/email-draft"

type Props = {
  label: string
  value: LinkedRecord | null
  onChange: (record: LinkedRecord | null) => void
  /** Runs on the server as staff type; returns the matches to offer. */
  search: (query: string) => Promise<LinkedRecord[] | null>
  placeholder: string
  /** Quick choices shown before anything is typed, e.g. the student's application schools. */
  suggestions?: LinkedRecord[]
}

/**
 * Picks one student or school from a server search, for linking an email.
 * Only the newest search may fill the list, so a slow earlier answer never
 * replaces what matches the text in the box.
 */
export function RecordSearchPicker({ label, value, onChange, search, placeholder, suggestions = [] }: Props) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<LinkedRecord[]>([])
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle")
  const latest = useRef(0)

  const run = useDebouncedCallback(async (text: string) => {
    const request = ++latest.current
    try {
      const found = await search(text)
      if (request !== latest.current) return
      setResults(found ?? [])
      setStatus(found ? "idle" : "error")
    } catch {
      if (request !== latest.current) return
      setStatus("error")
    }
  }, 300)

  const onQuery = (text: string) => {
    setQuery(text)
    if (text.trim().length < 2) {
      latest.current++
      setResults([])
      setStatus("idle")
      return
    }
    setStatus("loading")
    run(text)
  }

  const options = query.trim().length < 2 ? suggestions : results
  const message = status === "loading" ? "Searching…"
    : status === "error" ? "Search failed. Try again."
      : query.trim().length >= 2 && options.length === 0 ? "No match"
        : options.length === 0 ? "Type a name to search" : null
  const pick = (record: LinkedRecord) => {
    onChange(record)
    setOpen(false)
    setQuery("")
    setResults([])
  }

  if (value) {
    return (
      <div className="flex min-h-9 items-center gap-2 rounded-md border px-3 py-1.5 text-sm">
        <span className="truncate">{value.name}</span>
        <Button type="button" variant="ghost" size="icon" className="ml-auto h-7 w-7"
          aria-label={`Remove ${label.toLowerCase()} link`} onClick={() => onChange(null)}>
          <X className="h-4 w-4" />
        </Button>
      </div>
    )
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button type="button" variant="outline" className="w-full justify-start gap-2 font-normal text-muted-foreground">
          <Search className="h-4 w-4" />
          {placeholder}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] min-w-72 p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput value={query} onValueChange={onQuery} placeholder="Type at least 2 letters…" aria-label={`Search ${label.toLowerCase()}`} />
          <CommandList>
            {options.map(option => (
              <CommandItem key={option.id} value={option.id} onSelect={() => pick(option)}>{option.name}</CommandItem>
            ))}
          </CommandList>
          {message && <p className="border-t px-3 py-2 text-xs text-muted-foreground" role="status">{message}</p>}
        </Command>
      </PopoverContent>
    </Popover>
  )
}
