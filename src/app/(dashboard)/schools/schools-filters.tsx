"use client"

import { useCallback, useState, useTransition } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Search, X } from "lucide-react"
import { useDebouncedCallback } from "use-debounce"

export function SchoolsFilters() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()

  const [search, setSearch] = useState(searchParams.get("search") ?? "")

  const updateUrl = useCallback((updates: Record<string, string | null>) => {
    const params = new URLSearchParams(searchParams.toString())

    Object.entries(updates).forEach(([key, value]) => {
      if (value === null || value === "") {
        params.delete(key)
      } else {
        params.set(key, value)
      }
    })

    // Reset to page 1 when filters change
    if (!('page' in updates)) {
      params.delete('page')
    }

    startTransition(() => {
      router.push(`/schools?${params.toString()}`)
    })
  }, [router, searchParams])

  const debouncedSearch = useDebouncedCallback((value: string) => {
    updateUrl({ search: value || null })
  }, 300)

  const handleSearchChange = (value: string) => {
    setSearch(value)
    debouncedSearch(value)
  }

  const handleClearFilters = () => {
    setSearch("")
    startTransition(() => {
      router.push("/schools")
    })
  }

  const hasFilters = search || searchParams.has("country") || searchParams.has("gender") || searchParams.has("phase")

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-1 items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search schools..."
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Country Filter - simplified without dynamic data for now */}
        <Select
          value={searchParams.get("country") ?? "all"}
          onValueChange={(value) => updateUrl({ country: value === "all" ? null : value })}
        >
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Country" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Countries</SelectItem>
            <SelectItem value="1">England</SelectItem>
            <SelectItem value="2">Scotland</SelectItem>
            <SelectItem value="3">Wales</SelectItem>
            <SelectItem value="4">N. Ireland</SelectItem>
          </SelectContent>
        </Select>

        {/* Gender Type Filter */}
        <Select
          value={searchParams.get("gender") ?? "all"}
          onValueChange={(value) => updateUrl({ gender: value === "all" ? null : value })}
        >
          <SelectTrigger className="w-[130px]">
            <SelectValue placeholder="Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="1">Co-Ed</SelectItem>
            <SelectItem value="2">Boys</SelectItem>
            <SelectItem value="3">Girls</SelectItem>
          </SelectContent>
        </Select>

        {hasFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClearFilters}
            className="gap-1 text-muted-foreground"
          >
            <X className="h-4 w-4" />
            Clear
          </Button>
        )}
      </div>
    </div>
  )
}
