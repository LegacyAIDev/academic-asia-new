"use client"

import { useRouter, useSearchParams } from "next/navigation"
import { useState, useTransition } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Search, X } from "lucide-react"
import { useDebouncedCallback } from "use-debounce"

type StaffFiltersProps = {
  departments: { id: number; label: string }[]
}

/** Search bar and department filter for staff list */
export function StaffFilters({ departments }: StaffFiltersProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()
  const currentSearch = searchParams.get("search") ?? ""
  const currentDept = searchParams.get("department") ?? ""
  const [search, setSearch] = useState(currentSearch)

  const updateParams = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString())
    if (value) {
      params.set(key, value)
    } else {
      params.delete(key)
    }
    startTransition(() => {
      router.push(`/staff?${params.toString()}`)
    })
  }

  const handleSearch = useDebouncedCallback((value: string) => {
    updateParams("search", value)
  }, 300)

  const onSearchChange = (value: string) => {
    setSearch(value)
    handleSearch(value)
  }

  const clearFilters = () => {
    setSearch("")
    startTransition(() => {
      router.push("/staff")
    })
  }

  const hasFilters = currentSearch || currentDept

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-1 items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by name or email..."
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-9 bg-background"
          />
          {search && (
            <button
              onClick={() => onSearchChange("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        <div className="flex items-center gap-2">
          {departments.map(dept => (
            <Button
              key={dept.id}
              variant={currentDept === String(dept.id) ? "default" : "outline"}
              size="sm"
              className="transition-all"
              onClick={() => updateParams("department", currentDept === String(dept.id) ? "" : String(dept.id))}
            >
              {dept.label}
            </Button>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-3">
        {hasFilters && (
          <Button variant="ghost" size="sm" onClick={clearFilters} className="gap-2 text-muted-foreground">
            <X className="h-4 w-4" />
            Clear filters
          </Button>
        )}
        {isPending && (
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        )}
      </div>
    </div>
  )
}
