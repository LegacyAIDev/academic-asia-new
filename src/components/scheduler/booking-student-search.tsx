'use client'

import { useState } from 'react'
import { useDebouncedCallback } from 'use-debounce'
import { Search } from 'lucide-react'
import { Command, CommandEmpty, CommandInput, CommandItem, CommandList } from '@/components/ui/command'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Button } from '@/components/ui/button'
import { searchStudentsAction } from '@/lib/supabase/actions/scheduler-people'
import type { SchedulerStudentOption } from '@/lib/supabase/queries/scheduler-people'

/** Debounced student lookup, reused by the single-student field and the candidates table. */
export function BookingStudentSearch({
  onSelect,
  placeholder = 'Search students...',
}: {
  onSelect: (student: SchedulerStudentOption) => void
  placeholder?: string
}) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SchedulerStudentOption[]>([])
  const [loading, setLoading] = useState(false)

  const search = useDebouncedCallback(async (q: string) => {
    if (!q.trim()) {
      setResults([])
      return
    }
    setLoading(true)
    const result = await searchStudentsAction(q)
    setLoading(false)
    if (result.success) setResults(result.data ?? [])
  }, 300)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button type="button" variant="outline" className="w-full justify-start font-normal">
          <Search className="mr-2 h-4 w-4 text-muted-foreground" />
          {placeholder}
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
            placeholder="Name or student code..."
          />
          <CommandList>
            <CommandEmpty>{loading ? 'Searching...' : 'No students found.'}</CommandEmpty>
            {results.map(student => (
              <CommandItem
                key={student.id}
                value={student.id}
                onSelect={() => {
                  onSelect(student)
                  setOpen(false)
                  setQuery('')
                  setResults([])
                }}
              >
                {student.first_name} {student.surname}
                {student.student_code ? ` · ${student.student_code}` : ''}
              </CommandItem>
            ))}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
