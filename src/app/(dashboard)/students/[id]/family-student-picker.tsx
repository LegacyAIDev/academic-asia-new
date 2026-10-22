"use client"

import { useRef, useState } from "react"
import { useDebouncedCallback } from "use-debounce"
import { GraduationCap, Search, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Command, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { searchStudentsForFamilyAction } from "@/lib/supabase/actions/student-family"
import { linkedStudentDetails, linkedStudentName } from "@/lib/students/linked-student-label"
import type { LinkedStudent } from "@/lib/supabase/queries/student-family"

type FamilyStudentPickerProps = {
  /** The student whose family this is; never offered as their own relative. */
  studentId: string
  value: LinkedStudent | null
  onChange: (student: LinkedStudent | null) => void
}

type SearchState = "idle" | "loading" | "error"

/**
 * "Already a student?" in the family member dialog. With 26,000+ students the
 * list cannot live in the browser, so it asks the server as staff type (every
 * word must match the names or the code) and shows code, birth date and school
 * to tell namesakes apart. Once a student is picked it shows them with a way to
 * undo the link.
 */
export function FamilyStudentPicker({ studentId, value, onChange }: FamilyStudentPickerProps) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<LinkedStudent[]>([])
  const [state, setState] = useState<SearchState>("idle")
  // Only the newest search may fill the list; a slow earlier answer is dropped.
  const latest = useRef(0)

  const search = useDebouncedCallback(async (text: string) => {
    const request = ++latest.current
    try {
      const result = await searchStudentsForFamilyAction(text, studentId)
      if (request !== latest.current) return
      setResults(result.success ? result.data ?? [] : [])
      setState(result.success ? "idle" : "error")
    } catch {
      if (request !== latest.current) return
      setResults([])
      setState("error")
    }
  }, 300)

  function type(text: string) {
    setQuery(text)
    // Any answer still on its way is for older text now.
    latest.current++
    if (!text.trim()) {
      search.cancel()
      setResults([])
      setState("idle")
      return
    }
    setState("loading")
    search(text)
  }

  function pick(student: LinkedStudent) {
    search.cancel()
    latest.current++
    onChange(student)
    setOpen(false)
    setQuery("")
    setResults([])
    setState("idle")
  }

  if (value) {
    return (
      <div className="flex items-center gap-3 rounded-lg border border-border bg-muted/40 px-3 py-2">
        <GraduationCap className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{linkedStudentName(value)}</p>
          <p className="truncate text-xs text-muted-foreground tabular-nums">{linkedStudentDetails(value)}</p>
        </div>
        <Button type="button" variant="ghost" size="sm" className="h-9 gap-1.5" onClick={() => onChange(null)}>
          <X className="h-3.5 w-3.5" /> Remove link
        </Button>
      </div>
    )
  }

  const status = state === "loading" ? "Searching…"
    : state === "error" ? "Search failed. Try again."
    : results.length > 0 ? null
    : query.trim() ? "No student matches." : "Type a name, Chinese name or student code."

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button type="button" variant="outline" aria-haspopup="listbox" className="h-10 w-full justify-start gap-2 font-normal text-muted-foreground">
          <Search className="h-4 w-4" /> Already a student? Search by name or code
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] min-w-[20rem] p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput
            value={query}
            onValueChange={type}
            placeholder="e.g. chan tai man or S046020"
            aria-label="Search students"
          />
          <CommandList>
            {status && (
              <p role="status" aria-live="polite" className="px-3 py-4 text-center text-sm text-muted-foreground">{status}</p>
            )}
            {results.map((student) => (
              <CommandItem
                key={student.id}
                value={student.id}
                onSelect={() => pick(student)}
                className="flex-col items-start gap-0.5"
              >
                <span className="text-sm font-medium">{linkedStudentName(student)}</span>
                <span className="text-xs text-muted-foreground tabular-nums">{linkedStudentDetails(student)}</span>
              </CommandItem>
            ))}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
