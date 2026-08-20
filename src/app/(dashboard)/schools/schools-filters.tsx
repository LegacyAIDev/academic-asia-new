"use client"

import { useCallback, useState, useTransition } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Search, SlidersHorizontal, X } from "lucide-react"
import { useDebouncedCallback } from "use-debounce"
import type { SchoolFilterOptions } from "@/lib/supabase/queries/schools"

/** URL params this component owns, with the labels shown on the active chips. */
const FILTER_KEYS = {
  country: "Country",
  gender: "Type",
  phase: "Phase",
  county: "County",
  religion: "Religion",
  institution: "Institution",
  minPupils: "Pupils ≥",
  minBoarders: "Boarders ≥",
  maxFee: "Fee ≤",
} as const

type FilterKey = keyof typeof FILTER_KEYS

/** Sentinel for "no selection" — Radix Select cannot hold an empty string value. */
const ANY = "__any__"

export function SchoolsFilters({ options }: { options: SchoolFilterOptions }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [, startTransition] = useTransition()

  const [search, setSearch] = useState(searchParams.get("search") ?? "")
  const [minPupils, setMinPupils] = useState(searchParams.get("minPupils") ?? "")
  const [minBoarders, setMinBoarders] = useState(searchParams.get("minBoarders") ?? "")
  const [maxFee, setMaxFee] = useState(searchParams.get("maxFee") ?? "")

  const updateUrl = useCallback(
    (updates: Record<string, string | null>) => {
      const params = new URLSearchParams(searchParams.toString())

      Object.entries(updates).forEach(([key, value]) => {
        if (value === null || value === "" || value === ANY) params.delete(key)
        else params.set(key, value)
      })

      // Any filter change invalidates the current page number.
      if (!("page" in updates)) params.delete("page")

      startTransition(() => {
        router.push(`/schools?${params.toString()}`)
      })
    },
    [router, searchParams]
  )

  const debouncedSearch = useDebouncedCallback(
    (value: string) => updateUrl({ search: value || null }),
    300
  )
  const debouncedNumber = useDebouncedCallback(
    (key: string, value: string) => updateUrl({ [key]: value || null }),
    400
  )

  const activeKeys = (Object.keys(FILTER_KEYS) as FilterKey[]).filter((k) => searchParams.has(k))
  const hasAnything = activeKeys.length > 0 || search

  const clearAll = () => {
    setSearch("")
    setMinPupils("")
    setMinBoarders("")
    setMaxFee("")
    startTransition(() => router.push("/schools"))
  }

  /** Label for an active chip: the option's own label rather than its raw id. */
  const chipValue = (key: FilterKey): string => {
    const raw = searchParams.get(key) ?? ""
    const byId = (list: { id: number; label: string }[]) =>
      list.find((o) => String(o.id) === raw)?.label ?? raw
    switch (key) {
      case "country":
        return byId(options.countries)
      case "gender":
        return byId(options.genderTypes)
      case "phase":
        return byId(options.phases)
      case "institution":
        return byId(options.institutionTypes)
      case "religion":
        return byId(options.religiousAffiliations)
      case "maxFee":
        return `£${Number(raw).toLocaleString("en-GB")}`
      default:
        return raw
    }
  }

  const selectFilter = (
    key: FilterKey,
    label: string,
    list: { id: number; label: string }[]
  ) => (
    <div className="space-y-1.5">
      <Label className="text-xs font-medium">{label}</Label>
      <Select
        value={searchParams.get(key) ?? ANY}
        onValueChange={(v) => updateUrl({ [key]: v })}
      >
        <SelectTrigger className="h-9">
          <SelectValue placeholder="Any" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ANY}>Any</SelectItem>
          {list.map((o) => (
            <SelectItem key={o.id} value={String(o.id)}>
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-0 flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search schools..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
              debouncedSearch(e.target.value)
            }}
            className="pl-9"
          />
        </div>

        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm">
              <SlidersHorizontal className="mr-1.5 h-4 w-4" />
              Filters
              {activeKeys.length > 0 && (
                <Badge variant="secondary" className="ml-1.5 px-1.5">
                  {activeKeys.length}
                </Badge>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent align="start" className="w-[34rem] max-w-[90vw]">
            <div className="grid grid-cols-2 gap-3">
              {selectFilter("country", "Country", options.countries)}
              {selectFilter("gender", "Type", options.genderTypes)}
              {selectFilter("phase", "Phase", options.phases)}
              {selectFilter("institution", "Institution type", options.institutionTypes)}
              {selectFilter("religion", "Religious affiliation", options.religiousAffiliations)}

              <div className="space-y-1.5">
                <Label className="text-xs font-medium">County</Label>
                <Select
                  value={searchParams.get("county") ?? ANY}
                  onValueChange={(v) => updateUrl({ county: v })}
                >
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Any" />
                  </SelectTrigger>
                  <SelectContent className="max-h-72">
                    <SelectItem value={ANY}>Any</SelectItem>
                    {options.counties.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Separator className="my-3" />

            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="minPupils" className="text-xs font-medium">
                  Pupils at least
                </Label>
                <Input
                  id="minPupils"
                  type="number"
                  min="0"
                  inputMode="numeric"
                  placeholder="Any"
                  className="h-9"
                  value={minPupils}
                  onChange={(e) => {
                    setMinPupils(e.target.value)
                    debouncedNumber("minPupils", e.target.value)
                  }}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="minBoarders" className="text-xs font-medium">
                  Boarders at least
                </Label>
                <Input
                  id="minBoarders"
                  type="number"
                  min="0"
                  inputMode="numeric"
                  placeholder="Any"
                  className="h-9"
                  value={minBoarders}
                  onChange={(e) => {
                    setMinBoarders(e.target.value)
                    debouncedNumber("minBoarders", e.target.value)
                  }}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="maxFee" className="text-xs font-medium">
                  Fee at most (£)
                </Label>
                <Input
                  id="maxFee"
                  type="number"
                  min="0"
                  inputMode="numeric"
                  placeholder="Any"
                  className="h-9"
                  value={maxFee}
                  onChange={(e) => {
                    setMaxFee(e.target.value)
                    debouncedNumber("maxFee", e.target.value)
                  }}
                />
              </div>
            </div>

            {/* Fee years differ per school, so the filter is not a like-for-like
                comparison. The table shows each school's fee year for that reason. */}
            <p className="mt-2 text-xs text-muted-foreground">
              Fee compares each school&apos;s most recently recorded course fee, which is not the
              same year for every school. Schools with no recorded fee are excluded.
            </p>
          </PopoverContent>
        </Popover>

        {hasAnything && (
          <Button variant="ghost" size="sm" onClick={clearAll}>
            <X className="mr-1.5 h-4 w-4" />
            Clear
          </Button>
        )}
      </div>

      {activeKeys.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5">
          {activeKeys.map((key) => (
            <span
              key={key}
              className="inline-flex items-center gap-1 rounded-md border bg-muted/40 py-0.5 pl-2 pr-1 text-xs"
            >
              <span className="text-muted-foreground">{FILTER_KEYS[key]}</span>
              <span className="font-medium">{chipValue(key)}</span>
              <button
                type="button"
                onClick={() => {
                  if (key === "minPupils") setMinPupils("")
                  if (key === "minBoarders") setMinBoarders("")
                  if (key === "maxFee") setMaxFee("")
                  updateUrl({ [key]: null })
                }}
                className="rounded-sm p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                aria-label={`Clear ${FILTER_KEYS[key]} filter`}
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  )
}
