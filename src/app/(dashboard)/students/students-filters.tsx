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
import { Search, X, SlidersHorizontal } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

type ReferenceItem = {
  id: number
  code: string
  label: string
}

export function StudentsFilters() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()

  const [search, setSearch] = useState(searchParams.get('search') ?? '')
  const [statuses, setStatuses] = useState<ReferenceItem[]>([])
  const [placements, setPlacements] = useState<ReferenceItem[]>([])

  // Fetch reference data for dropdowns
  useEffect(() => {
    const fetchReferenceData = async () => {
      const supabase = createClient()

      const [statusRes, placementRes] = await Promise.all([
        supabase.from('student_statuses').select('id, code, label').order('sort_order'),
        supabase.from('placement_statuses').select('id, code, label').order('sort_order'),
      ])

      if (statusRes.data) setStatuses(statusRes.data)
      if (placementRes.data) setPlacements(placementRes.data)
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

  // Handle filter changes
  const handleStatusChange = (value: string) => {
    startTransition(() => {
      router.push(`${pathname}?${createQueryString({ status: value === 'all' ? null : value })}`)
    })
  }

  const handlePlacementChange = (value: string) => {
    startTransition(() => {
      router.push(`${pathname}?${createQueryString({ placement: value === 'all' ? null : value })}`)
    })
  }

  // Clear all filters
  const clearFilters = () => {
    setSearch('')
    startTransition(() => {
      router.push(pathname)
    })
  }

  const hasFilters = search || searchParams.get('status') || searchParams.get('placement')

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
