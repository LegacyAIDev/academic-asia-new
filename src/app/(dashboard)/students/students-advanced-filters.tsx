'use client'

import { useEffect, useMemo, useState } from 'react'
import type { ReadonlyURLSearchParams } from 'next/navigation'
import { SlidersHorizontal, User, GraduationCap, Building2, Mail, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  Sheet, SheetClose, SheetContent, SheetDescription, SheetFooter, SheetHeader,
  SheetTitle, SheetTrigger,
} from '@/components/ui/sheet'
import { SearchableSelect, type SearchableOption } from '@/components/ui/searchable-select'
import { createClient } from '@/lib/supabase/client'

const fieldLabel = 'text-xs font-medium text-muted-foreground'

// URL params owned by this panel — used for the active count and "clear all".
const ADVANCED_KEYS = [
  'gender', 'dob_from', 'dob_to', 'entry_from', 'entry_to',
  'course', 'school', 'event', 'has_email', 'has_phone',
] as const

type Course = { id: number; label: string }

type Props = {
  searchParams: ReadonlyURLSearchParams
  onApply: (params: Record<string, string | null>) => void
}

/** Collapsible "Filters" sheet holding the advanced student filters. */
export function StudentsAdvancedFilters({ searchParams, onApply }: Props) {
  const [courses, setCourses] = useState<Course[]>([])
  const [schools, setSchools] = useState<SearchableOption[]>([])
  const [events, setEvents] = useState<SearchableOption[]>([])

  useEffect(() => {
    const supabase = createClient()
    const load = async () => {
      const [courseRes, schoolRes, eventRes] = await Promise.all([
        supabase.from('courses').select('id, label').eq('is_active', true).order('sort_order'),
        supabase.from('schools').select('id, name').order('name'),
        supabase.from('events').select('id, name').order('name'),
      ])
      // Supabase-js bails deep select inference to `never` on large tables, so
      // type these rows explicitly.
      const schoolRows = (schoolRes.data ?? []) as { id: string; name: string }[]
      const eventRows = (eventRes.data ?? []) as { id: string; name: string }[]
      if (courseRes.data) setCourses(courseRes.data as Course[])
      setSchools(schoolRows.map((s) => ({ value: s.id, label: s.name })))
      setEvents(eventRows.map((e) => ({ value: e.id, label: e.name })))
    }
    load()
  }, [])

  const activeCount = useMemo(
    () => ADVANCED_KEYS.filter((k) => searchParams.get(k)).length,
    [searchParams]
  )

  const clearAdvanced = () =>
    onApply(Object.fromEntries(ADVANCED_KEYS.map((k) => [k, null])))

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="outline" className="gap-2 bg-background">
          <SlidersHorizontal className="h-4 w-4" />
          Filters
          {activeCount > 0 && (
            <Badge className="ml-1 h-5 min-w-5 justify-center rounded-full px-1.5">{activeCount}</Badge>
          )}
        </Button>
      </SheetTrigger>

      <SheetContent className="flex w-full flex-col gap-0 p-0 sm:max-w-md">
        {/* Header */}
        <SheetHeader className="gap-0 border-b p-5">
          <div className="flex items-center gap-3 pr-8">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 shadow-sm">
              <SlidersHorizontal className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1">
              <SheetTitle className="text-base">Filter students</SheetTitle>
              <SheetDescription className="text-xs">
                Narrow the list by profile, enrolment, applications and contact.
              </SheetDescription>
            </div>
            {activeCount > 0 && (
              <Badge variant="secondary" className="shrink-0 rounded-full font-medium">
                {activeCount} active
              </Badge>
            )}
          </div>
        </SheetHeader>

        {/* Scrollable body */}
        <div className="flex-1 space-y-4 overflow-y-auto p-5">
          <FilterSection icon={User} title="Personal">
            <div className="space-y-2">
              <Label className={fieldLabel}>Sex</Label>
              <Select
                value={searchParams.get('gender') ?? 'all'}
                onValueChange={(v) => onApply({ gender: v === 'all' ? null : v })}
              >
                <SelectTrigger className="bg-background"><SelectValue placeholder="Any" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Any</SelectItem>
                  <SelectItem value="M">Male</SelectItem>
                  <SelectItem value="F">Female</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className={fieldLabel}>Date of birth</Label>
              <div className="flex items-center gap-2">
                <Input type="date" value={searchParams.get('dob_from') ?? ''}
                  onChange={(e) => onApply({ dob_from: e.target.value || null })} />
                <span className="text-xs text-muted-foreground">to</span>
                <Input type="date" value={searchParams.get('dob_to') ?? ''}
                  onChange={(e) => onApply({ dob_to: e.target.value || null })} />
              </div>
            </div>
          </FilterSection>

          <FilterSection icon={GraduationCap} title="Enrolment">
            <div className="space-y-2">
              <Label className={fieldLabel}>Entry year (CSD)</Label>
              {/* Keyed so external clears/nav reset the draft inputs without an effect */}
              <EntryYearRange
                key={`${searchParams.get('entry_from') ?? ''}|${searchParams.get('entry_to') ?? ''}`}
                from={searchParams.get('entry_from') ?? ''}
                to={searchParams.get('entry_to') ?? ''}
                onApply={onApply}
              />
            </div>

            <div className="space-y-2">
              <Label className={fieldLabel}>Course</Label>
              <Select
                value={searchParams.get('course') ?? 'all'}
                onValueChange={(v) => onApply({ course: v === 'all' ? null : v })}
              >
                <SelectTrigger className="bg-background"><SelectValue placeholder="Any course" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Any course</SelectItem>
                  {courses.map((c) => (
                    <SelectItem key={c.id} value={c.id.toString()}>{c.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </FilterSection>

          <FilterSection icon={Building2} title="Applications">
            <div className="space-y-2">
              <Label className={fieldLabel}>School applied</Label>
              <SearchableSelect
                options={schools}
                value={searchParams.get('school')}
                onChange={(v) => onApply({ school: v })}
                placeholder="Any school"
                searchPlaceholder="Search schools..."
                emptyText="No schools found."
                className="w-full"
              />
            </div>

            <div className="space-y-2">
              <Label className={fieldLabel}>Event</Label>
              <SearchableSelect
                options={events}
                value={searchParams.get('event')}
                onChange={(v) => onApply({ event: v })}
                placeholder="Any event"
                searchPlaceholder="Search events..."
                emptyText="No events found."
                className="w-full"
              />
            </div>
          </FilterSection>

          <FilterSection icon={Mail} title="Contact">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className={fieldLabel}>Email</Label>
                <Select
                  value={searchParams.get('has_email') ?? 'all'}
                  onValueChange={(v) => onApply({ has_email: v === 'all' ? null : v })}
                >
                  <SelectTrigger className="bg-background"><SelectValue placeholder="Any" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Any</SelectItem>
                    <SelectItem value="yes">Has email</SelectItem>
                    <SelectItem value="no">No email</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className={fieldLabel}>Telephone</Label>
                <Select
                  value={searchParams.get('has_phone') ?? 'all'}
                  onValueChange={(v) => onApply({ has_phone: v === 'all' ? null : v })}
                >
                  <SelectTrigger className="bg-background"><SelectValue placeholder="Any" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Any</SelectItem>
                    <SelectItem value="yes">Has telephone</SelectItem>
                    <SelectItem value="no">No telephone</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </FilterSection>
        </div>

        {/* Sticky footer */}
        <SheetFooter className="flex-row items-center gap-2 border-t p-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={clearAdvanced}
            disabled={activeCount === 0}
            className="gap-1.5 text-muted-foreground"
          >
            <X className="h-4 w-4" />
            Clear all
          </Button>
          <SheetClose asChild>
            <Button size="sm" className="ml-auto shadow-sm">Show results</Button>
          </SheetClose>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}

/** Titled, icon-led group that visually clusters related filters. */
function FilterSection({
  icon: Icon, title, children,
}: {
  icon: React.ElementType
  title: string
  children: React.ReactNode
}) {
  return (
    <section className="rounded-xl border bg-muted/20 p-4">
      <div className="mb-3 flex items-center gap-2">
        <div className="flex h-6 w-6 items-center justify-center rounded-md bg-primary/10">
          <Icon className="h-3.5 w-3.5 text-primary" />
        </div>
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {title}
        </h3>
      </div>
      <div className="space-y-4">{children}</div>
    </section>
  )
}

/** Entry-year range with draft state applied on blur (commits to the URL). */
function EntryYearRange({
  from, to, onApply,
}: {
  from: string
  to: string
  onApply: (params: Record<string, string | null>) => void
}) {
  const [entryFrom, setEntryFrom] = useState(from)
  const [entryTo, setEntryTo] = useState(to)

  return (
    <div className="flex items-center gap-2">
      <Input type="number" inputMode="numeric" placeholder="From" value={entryFrom}
        onChange={(e) => setEntryFrom(e.target.value)}
        onBlur={() => onApply({ entry_from: entryFrom || null })} />
      <span className="text-sm text-muted-foreground">to</span>
      <Input type="number" inputMode="numeric" placeholder="To" value={entryTo}
        onChange={(e) => setEntryTo(e.target.value)}
        onBlur={() => onApply({ entry_to: entryTo || null })} />
    </div>
  )
}
