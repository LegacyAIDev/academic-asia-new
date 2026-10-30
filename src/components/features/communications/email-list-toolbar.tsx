"use client"

import { Search, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { DIRECTION_LABELS, type EmailDirection } from "@/lib/emails/email-form"
import { EMPTY_FILTERS, hasActiveFilters, type EmailListFilters } from "@/lib/emails/email-list"

type Props = {
  filters: EmailListFilters
  onChange: (filters: EmailListFilters) => void
  /** The student's applications, to filter by; omitted where it does not apply. */
  applications?: { id: string; label: string }[]
}

/** Keyword search, filters and "Clear filters" above the list (WEB-01, EF-16). */
export function EmailListToolbar({ filters, onChange, applications }: Props) {
  const set = <K extends keyof EmailListFilters>(key: K, value: EmailListFilters[K]) => onChange({ ...filters, [key]: value })

  return (
    <div className="flex flex-wrap items-end gap-3">
      <div className="relative min-w-56 flex-1">
        <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input value={filters.query} onChange={e => set("query", e.target.value)} className="pl-8"
          placeholder="Search subject, sender, text, attachments" aria-label="Search emails" />
      </div>

      <Select value={filters.direction} onValueChange={v => set("direction", v as EmailDirection | "all")}>
        <SelectTrigger className="w-36" aria-label="Direction"><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All directions</SelectItem>
          {(Object.keys(DIRECTION_LABELS) as EmailDirection[]).map(d => <SelectItem key={d} value={d}>{DIRECTION_LABELS[d]}</SelectItem>)}
        </SelectContent>
      </Select>

      {applications && applications.length > 0 && (
        <Select value={filters.applicationId} onValueChange={v => set("applicationId", v)}>
          <SelectTrigger className="w-56" aria-label="Application"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All applications</SelectItem>
            {applications.map(a => <SelectItem key={a.id} value={a.id}>{a.label}</SelectItem>)}
          </SelectContent>
        </Select>
      )}

      <div className="flex items-end gap-2">
        <div className="space-y-1">
          <Label htmlFor="emails-from" className="text-xs text-muted-foreground">From</Label>
          <Input id="emails-from" type="date" value={filters.fromDay} max={filters.toDay || undefined}
            onChange={e => set("fromDay", e.target.value)} className="w-40" />
        </div>
        <div className="space-y-1">
          <Label htmlFor="emails-to" className="text-xs text-muted-foreground">To</Label>
          <Input id="emails-to" type="date" value={filters.toDay} min={filters.fromDay || undefined}
            onChange={e => set("toDay", e.target.value)} className="w-40" />
        </div>
      </div>

      <div className="flex h-9 items-center gap-2">
        <Switch id="emails-archived" checked={filters.showArchived} onCheckedChange={v => set("showArchived", v)} />
        <Label htmlFor="emails-archived" className="font-normal">Show archived</Label>
      </div>

      {hasActiveFilters(filters) && (
        <Button type="button" variant="ghost" size="sm" className="h-9 gap-1" onClick={() => onChange(EMPTY_FILTERS)}>
          <X className="h-4 w-4" />Clear filters
        </Button>
      )}
    </div>
  )
}
