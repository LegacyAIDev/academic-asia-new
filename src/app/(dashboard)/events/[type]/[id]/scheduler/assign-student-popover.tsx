'use client'

import { useState } from 'react'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Plus, Search } from 'lucide-react'
import type { UnassignedStudent } from '@/lib/supabase/queries/event-scheduler'

type AssignStudentPopoverProps = {
  students: UnassignedStudent[]
  onAssign: (studentId: string) => void
  disabled?: boolean
}

/** Popover with student search for assigning a student to an empty slot */
export function AssignStudentPopover({ students, onAssign, disabled }: AssignStudentPopoverProps) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')

  const filtered = students.filter(s => {
    if (!search) return true
    const name = `${s.first_name ?? ''} ${s.surname ?? ''} ${s.student_code ?? ''}`.toLowerCase()
    return name.includes(search.toLowerCase())
  })

  const handleSelect = (studentId: string) => {
    onAssign(studentId)
    setOpen(false)
    setSearch('')
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 shrink-0 text-muted-foreground/40 opacity-0 transition-all hover:text-primary group-hover:opacity-100"
          disabled={disabled}
        >
          <Plus className="h-3.5 w-3.5" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-0" align="end">
        <div className="border-b p-2.5">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Search student..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="h-9 pl-8 text-sm"
              autoFocus
            />
          </div>
        </div>
        <div className="max-h-52 overflow-y-auto p-1.5">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-6 text-center">
              <Search className="h-6 w-6 text-muted-foreground/30" />
              <p className="mt-1.5 text-xs text-muted-foreground">No students found</p>
            </div>
          ) : (
            filtered.map(s => (
              <button
                key={s.student_id}
                type="button"
                onClick={() => handleSelect(s.student_id)}
                className="flex w-full items-center justify-between rounded-md px-2.5 py-2 text-left text-sm transition-colors hover:bg-muted"
              >
                <span className="font-medium">{s.first_name} {s.surname}</span>
                {s.student_code && (
                  <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
                    {s.student_code}
                  </code>
                )}
              </button>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}
