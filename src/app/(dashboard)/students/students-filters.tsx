'use client'

import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { useCallback, useEffect, useState, useTransition } from 'react'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Search, X } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { StudentsAdvancedFilters } from './students-advanced-filters'

type ReferenceItem = {
  id: number
  code: string
  label: string
}

type Consultant = {
  id: string
  first_name: string | null
  surname: string | null
}

export function StudentsFilters() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()

  const [search, setSearch] = useState(searchParams.get('search') ?? '')
  const [statuses, setStatuses] = useState<ReferenceItem[]>([])
  const [placements, setPlacements] = useState<ReferenceItem[]>([])
  const [consultants, setConsultants] = useState<Consultant[]>([])

  // Fetch reference data for dropdowns
  useEffect(() => {
    const fetchReferenceData = async () => {
      const supabase = createClient()

      const [statusRes, placementRes, consultantRes] = await Promise.all([
        supabase.from('student_statuses').select('id, code, label').order('sort_order'),
        supabase.from('placement_statuses').select('id, code, label').order('sort_order'),
        supabase.from('profiles').select('id, first_name, surname').order('first_name'),
      ])

      if (statusRes.data) setStatuses(statusRes.data)
      if (placementRes.data) setPlacements(placementRes.data)
      if (consultantRes.data) setConsultants(consultantRes.data)
    }

    fetchReferenceData()
  }, [])

  // Create URL with updated params
  const createQueryString = useCallback(
    (params: Record<string, string | null>) => {
      const newParams = new URLSearchParams(searchParams.toString())

      Object.entries(params).forEach(([key, value]) => {
        if (value === null || value === '') {
          newParams.delete(key)
        } else {
          newParams.set(key, value)
        }
      })

      // Reset to page 1 when filters change
      if (!params.page) {
        newParams.delete('page')
      }

      return newParams.toString()
    },
    [searchParams]
  )

  // Handle search with debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      const currentSearch = searchParams.get('search') ?? ''
      if (search !== currentSearch) {
        startTransition(() => {
          router.push(`${pathname}?${createQueryString({ search: search || null })}`)
        })
      }
    }, 300)

    return () => clearTimeout(timer)
  }, [search, searchParams, pathname, router, createQueryString])

  // Push one or more filter params into the URL (null clears a param)
  const pushParams = useCallback(
    (params: Record<string, string | null>) => {
      startTransition(() => {
        router.push(`${pathname}?${createQueryString(params)}`)
      })
    },
    [router, pathname, createQueryString]
  )

  const handleStatusChange = (value: string) =>
    pushParams({ status: value === 'all' ? null : value })

  const handlePlacementChange = (value: string) =>
    pushParams({ placement: value === 'all' ? null : value })

  const handleConsultantChange = (value: string) =>
    pushParams({ assigned: value === 'all' ? null : value })

  // Clear all filters
  const clearFilters = () => {
    setSearch('')
    startTransition(() => {
      router.push(pathname)
    })
  }

  const consultantName = (c: Consultant) =>
    [c.first_name, c.surname].filter(Boolean).join(' ') || 'Unnamed'

  // Any active filter (search or any URL param other than the page number)
  const hasFilters =
    Boolean(search) || Array.from(searchParams.keys()).some((k) => k !== 'page')

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-1 items-center gap-3">
        {/* Search Input */}
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search students..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-background"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Status Filter */}
        <Select
          value={searchParams.get('status') ?? 'all'}
          onValueChange={handleStatusChange}
        >
          <SelectTrigger className="w-[140px] bg-background">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            {statuses.map((status) => (
              <SelectItem key={status.id} value={status.id.toString()}>
                {status.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Placement Filter */}
        <Select
          value={searchParams.get('placement') ?? 'all'}
          onValueChange={handlePlacementChange}
        >
          <SelectTrigger className="w-[140px] bg-background">
            <SelectValue placeholder="Lead" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Leads</SelectItem>
            {placements.map((placement) => (
              <SelectItem key={placement.id} value={placement.id.toString()}>
                {placement.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Consultant-in-Charge (CIC) Filter */}
        <Select
          value={searchParams.get('assigned') ?? 'all'}
          onValueChange={handleConsultantChange}
        >
          <SelectTrigger className="w-[170px] bg-background">
            <SelectValue placeholder="Consultant" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Consultants</SelectItem>
            {consultants.map((consultant) => (
              <SelectItem key={consultant.id} value={consultant.id}>
                {consultantName(consultant)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Advanced filters (sex, DOB, entry year, course, school applied, event, contact) */}
        <StudentsAdvancedFilters searchParams={searchParams} onApply={pushParams} />
      </div>

      {/* Clear Filters */}
      {hasFilters && (
        <Button
          variant="ghost"
          size="sm"
          onClick={clearFilters}
          className="gap-2 text-muted-foreground"
        >
          <X className="h-4 w-4" />
          Clear filters
        </Button>
      )}

      {/* Loading indicator */}
      {isPending && (
        <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      )}
    </div>
  )
}
