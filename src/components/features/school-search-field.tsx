'use client'

import { useState } from 'react'
import { useDebouncedCallback } from 'use-debounce'
import { Search, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Command, CommandEmpty, CommandInput, CommandItem, CommandList } from '@/components/ui/command'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { searchSchoolsAction } from '@/lib/supabase/actions/school-search'

type School = { id: string; name: string }

/**
 * Pick a school by typing part of its name (UAT DEV24-009: the form asked for
 * the school's internal id). Posts the chosen id under `name`; empty when none.
 */
export function SchoolSearchField({ name, defaultSchool = null, className }: { name: string; defaultSchool?: School | null; className?: string }) {
  const [school, setSchool] = useState<School | null>(defaultSchool)
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<School[]>([])
  const [loading, setLoading] = useState(false)

  const search = useDebouncedCallback(async (q: string) => {
    if (q.trim().length < 2) {
      setResults([])
      return
    }
    setLoading(true)
    const result = await searchSchoolsAction(q)
    setLoading(false)
    if (result.success) setResults(result.data ?? [])
  }, 300)

  const empty = loading ? 'Searching...' : query.trim().length < 2 ? 'Type at least two letters of the name.' : 'No school found. Add it under Schools first.'

  return (
    <div className="flex items-center gap-1">
      <input type="hidden" name={name} value={school?.id ?? ''} />
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button type="button" variant="outline" className={`flex-1 justify-start font-normal ${className ?? ''}`} aria-label="School">
            <Search className="mr-2 h-4 w-4 text-muted-foreground" />
            {school ? school.name : <span className="text-muted-foreground">Search schools (optional)</span>}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[320px] p-0" align="start">
          <Command shouldFilter={false}>
            <CommandInput
              value={query}
              onValueChange={v => {
                setQuery(v)
                search(v)
              }}
              placeholder="School name..."
            />
            <CommandList>
              <CommandEmpty>{empty}</CommandEmpty>
              {results.map(option => (
                <CommandItem
                  key={option.id}
                  value={option.id}
                  onSelect={() => {
                    setSchool(option)
                    setOpen(false)
                    setQuery('')
                    setResults([])
                  }}
                >
                  {option.name}
                </CommandItem>
              ))}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      {school && (
        <Button type="button" variant="ghost" size="icon" className="h-9 w-9 shrink-0" onClick={() => setSchool(null)} aria-label="Clear school">
          <X className="h-4 w-4" />
        </Button>
      )}
    </div>
  )
}
