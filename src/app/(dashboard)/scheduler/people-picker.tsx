'use client'

import { useEffect, useState } from 'react'
import { useDebouncedCallback } from 'use-debounce'
import { Check, Users } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command'
import { cn } from '@/lib/utils'
import { searchStudentsAction } from '@/lib/supabase/actions/scheduler-people'
import type { SchedulerStaffOption, SchedulerStudentOption } from '@/lib/supabase/queries/scheduler-people'

type Props = {
  staff: SchedulerStaffOption[]
  profileIds: string[]
  studentIds: string[]
  onChange: (profileIds: string[], studentIds: string[]) => void
}

const fullName = (p: { first_name: string | null; surname: string | null }) => `${p.first_name ?? ''} ${p.surname ?? ''}`.trim()

/** Multi-select of colleagues (preloaded) and students (searched) whose calendars overlay the team view. */
export function PeoplePicker({ staff, profileIds, studentIds, onChange }: Props) {
  const [open, setOpen] = useState(false)
  const [students, setStudents] = useState<SchedulerStudentOption[]>([])
  const [query, setQuery] = useState('')

  const search = useDebouncedCallback(async (q: string) => {
    if (q.trim().length < 2) return setStudents([])
    const result = await searchStudentsAction(q)
    setStudents(result.success && result.data ? result.data : [])
  }, 300)

  useEffect(() => {
    search(query)
  }, [query, search])

  const toggle = (list: string[], id: string) => (list.includes(id) ? list.filter(x => x !== id) : [...list, id])
  const count = profileIds.length + studentIds.length

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" className="h-9 tabular-nums">
          <Users className="mr-1 h-4 w-4" /> People{count > 0 ? ` (${count})` : ''}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[320px] p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput placeholder="Search colleagues or students…" value={query} onValueChange={setQuery} />
          <CommandList>
            <CommandEmpty>No matches.</CommandEmpty>
            <CommandGroup heading="Colleagues">
              {staff
                .filter(s => !query || fullName(s).toLowerCase().includes(query.toLowerCase()))
                .slice(0, 30)
                .map(s => (
                  <CommandItem key={s.id} value={`p:${s.id}`} onSelect={() => onChange(toggle(profileIds, s.id), studentIds)}>
                    <Check className={cn('mr-2 h-4 w-4', profileIds.includes(s.id) ? 'opacity-100' : 'opacity-0')} />
                    {fullName(s)}
                  </CommandItem>
                ))}
            </CommandGroup>
            {students.length > 0 && (
              <CommandGroup heading="Students">
                {students.map(s => (
                  <CommandItem key={s.id} value={`s:${s.id}`} onSelect={() => onChange(profileIds, toggle(studentIds, s.id))}>
                    <Check className={cn('mr-2 h-4 w-4', studentIds.includes(s.id) ? 'opacity-100' : 'opacity-0')} />
                    {fullName(s)} <span className="ml-1 text-muted-foreground">{s.student_code}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
