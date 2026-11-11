"use client"

import { useSearchParams } from "next/navigation"
import { useState, useTransition } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Loader2, Search, X } from "lucide-react"
import { useDebouncedCallback } from "use-debounce"
import { useRouterWithProgress } from "@/components/layout/navigation-progress"
import type { StaffFilterOption } from "@/lib/staff/filter-staff"

const ANY = "any"

type StaffFiltersProps = {
  /** Access levels someone has, with how many people have each. */
  levels: StaffFilterOption[]
  /** Departments someone belongs to; the filter hides while nobody has one. */
  departments: StaffFilterOption[]
  total: number
}

/** Search by name or email, and narrow by access level or department. */
export function StaffFilters({ levels, departments, total }: StaffFiltersProps) {
  const router = useRouterWithProgress()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()
  const currentSearch = searchParams.get("search") ?? ""
  const currentLevel = searchParams.get("level") ?? ""
  const currentDept = searchParams.get("department") ?? ""
  const [search, setSearch] = useState(currentSearch)

  const updateParams = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString())
    if (value) params.set(key, value)
    else params.delete(key)
    const query = params.toString()
    startTransition(() => router.push(query ? `/staff?${query}` : "/staff"))
  }

  const handleSearch = useDebouncedCallback((value: string) => updateParams("search", value.trim()), 300)

  const onSearchChange = (value: string) => {
    setSearch(value)
    handleSearch(value)
  }

  const clearFilters = () => {
    setSearch("")
    startTransition(() => router.push("/staff"))
  }

  const hasFilters = Boolean(currentSearch || currentLevel || currentDept)

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="relative min-w-[220px] max-w-sm flex-1">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          aria-label="Search staff"
          placeholder="Search by name or email"
          value={search}
          onChange={e => onSearchChange(e.target.value)}
          className="bg-background pl-9"
        />
        {search && (
          <button
            onClick={() => onSearchChange("")}
            aria-label="Clear the search"
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      <Select value={currentLevel || ANY} onValueChange={v => updateParams("level", v === ANY ? "" : v)}>
        <SelectTrigger className="w-[200px] bg-background" aria-label="Access level">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ANY}>Any access level ({total})</SelectItem>
          {levels.map(level => (
            <SelectItem key={level.id} value={String(level.id)}>{level.label} ({level.count})</SelectItem>
          ))}
        </SelectContent>
      </Select>

      {departments.length > 0 && (
        <Select value={currentDept || ANY} onValueChange={v => updateParams("department", v === ANY ? "" : v)}>
          <SelectTrigger className="w-[190px] bg-background" aria-label="Department">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ANY}>Any department</SelectItem>
            {departments.map(dept => (
              <SelectItem key={dept.id} value={String(dept.id)}>{dept.label} ({dept.count})</SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {hasFilters && (
        <Button variant="ghost" size="sm" onClick={clearFilters} className="gap-1.5 text-muted-foreground">
          <X className="h-4 w-4" /> Clear filters
        </Button>
      )}
      {isPending && <Loader2 role="status" aria-label="Updating the list" className="h-4 w-4 animate-spin text-muted-foreground" />}
    </div>
  )
}
