"use client"

import { useMemo, useState } from "react"
import { Check, ChevronsUpDown, Loader2, Plus, X } from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Command, CommandInput, CommandItem, CommandList, CommandSeparator } from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { addPresentSchool } from "@/lib/supabase/actions/present-schools"
import {
  PRESENT_SCHOOL_NAME_MAX,
  cleanSchoolName,
  filterPresentSchools,
  indexPresentSchools,
  presentSchoolKey,
  type PresentSchoolOption,
} from "@/lib/students/present-school-name"

type PresentSchoolPickerProps = {
  id: string
  schools: PresentSchoolOption[]
  /** The linked school, if any. */
  value: number | null
  /** What present_school holds now: the list name, or text typed before the list existed. */
  legacyText: string
  canAdd: boolean
  /** Lets the form hold its Save button while a new school is being added. */
  onAddingChange?: (adding: boolean) => void
}

/**
 * "Current School" in the student form: a search over the present-schools list
 * that also finds alternative spellings and ignores punctuation. It renders at
 * most 50 matches rather than handing 1,200+ rows to the command list.
 *
 * Posts two hidden fields. present_school_id is the chosen school; the server
 * copies its list name into present_school. Without a choice, present_school
 * keeps the old typed text so an unrelated edit does not wipe it; clearing the
 * field empties both.
 */
export function PresentSchoolPicker({ id, schools, value, legacyText, canAdd, onAddingChange }: PresentSchoolPickerProps) {
  const [options, setOptions] = useState(schools)
  const [selectedId, setSelectedId] = useState(value)
  const [text, setText] = useState(legacyText)
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")
  const [adding, setAdding] = useState(false)

  const index = useMemo(() => indexPresentSchools(options), [options])
  const { matches, more, exact } = useMemo(() => filterPresentSchools(index, query), [index, query])
  const typed = cleanSchoolName(query)
  const label = options.find((s) => s.id === selectedId)?.name ?? text
  const unlinked = selectedId === null && text !== ""
  const offerAdd = canAdd && !exact && presentSchoolKey(query) !== "" && typed.length <= PRESENT_SCHOOL_NAME_MAX

  function openChange(next: boolean) {
    // Start an unlinked student's search from their old text: the matching list
    // entries (e.g. both sections of a through-train school) show straight away.
    setQuery(next && unlinked ? text : "")
    setOpen(next)
  }

  function choose(school: { id: number; name: string } | null) {
    setSelectedId(school?.id ?? null)
    setText(school?.name ?? "")
    setQuery("")
    setOpen(false)
  }

  async function addTyped() {
    setAdding(true)
    onAddingChange?.(true)
    try {
      const result = await addPresentSchool(typed)
      if (!result.success || !result.data) {
        toast.error(result.error ?? "Could not add the school")
        return
      }
      const added = result.data
      setOptions((list) => list.some((s) => s.id === added.id)
        ? list
        : [...list, { id: added.id, name: added.name, aliases: [] }].sort((a, b) => a.name.localeCompare(b.name)))
      choose(added)
      toast.success(added.created ? "School added to the list" : `Already on the list as ${added.name}`)
    } catch {
      toast.error("Could not add the school. Check the connection and try again.")
    } finally {
      setAdding(false)
      onAddingChange?.(false)
    }
  }

  return (
    <div className="space-y-1.5">
      <input type="hidden" name="present_school_id" value={selectedId ?? ""} />
      <input type="hidden" name="present_school" value={text} />
      <Popover open={open} onOpenChange={openChange}>
        <PopoverTrigger asChild>
          <Button
            id={id}
            type="button"
            variant="outline"
            role="combobox"
            aria-haspopup="listbox"
            aria-expanded={open}
            disabled={adding}
            className="w-full justify-between bg-background font-normal"
          >
            <span className={cn("truncate", !label && "text-muted-foreground")}>{label || "Choose from the list"}</span>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[var(--radix-popover-trigger-width)] min-w-[18rem] p-0" align="start">
          <Command shouldFilter={false}>
            <CommandInput value={query} onValueChange={setQuery} placeholder="Search by name or short form" />
            <CommandList>
              {matches.length === 0 && (
                <p className="px-3 py-6 text-center text-sm text-muted-foreground">No school on the list matches.</p>
              )}
              {matches.map((school) => (
                <CommandItem key={school.id} value={String(school.id)} onSelect={() => choose(school)}>
                  <Check className={cn("h-4 w-4", school.id === selectedId ? "opacity-100" : "opacity-0")} />
                  <span className="truncate">{school.name}</span>
                </CommandItem>
              ))}
              {more && <p className="px-2 py-1.5 text-xs text-muted-foreground">Keep typing to narrow down</p>}
              {(offerAdd || label) && <CommandSeparator />}
              {offerAdd && (
                <CommandItem value="add-school" onSelect={addTyped} disabled={adding}>
                  {adding ? <Loader2 className="animate-spin" /> : <Plus />}
                  <span className="truncate">Add &ldquo;{typed}&rdquo; to the list</span>
                </CommandItem>
              )}
              {label && (
                <CommandItem value="clear-school" onSelect={() => choose(null)}>
                  <X />
                  Clear current school
                </CommandItem>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      {unlinked && (
        <p className="text-xs text-muted-foreground">
          Not on the list yet. Choose the matching school{canAdd ? " or add it" : ""}.
        </p>
      )}
    </div>
  )
}
