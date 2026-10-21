"use client"

import { useMemo, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import {
  Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { groupStatusesByStage } from "@/lib/applications/application-journey"
import { updateStudentApplication } from "@/lib/supabase/actions/student-applications"
import { Section } from "./application-section"

type Option = { id: number; code: string; label: string; category: string | null }

type Props = {
  applicationId: string
  studentId: string
  status: Option | null
  subStatus: Option | null
  /** Active statuses; the current one is added when it has been switched off since. */
  statuses: Option[]
  subStatuses: Option[]
}

const NONE = "none"

/** Adds the current value when it is no longer offered, so it still shows and can be kept. */
function withCurrent(options: Option[], current: Option | null): Option[] {
  return current && !options.some(o => o.id === current.id) ? [current, ...options] : options
}

/** Sub-statuses in their own categories (scholarship, conditional, process …), in the given order. */
function groupByCategory(options: Option[]): [string, Option[]][] {
  const groups = new Map<string, Option[]>()
  for (const option of options) {
    const key = option.category ?? "other"
    groups.set(key, [...(groups.get(key) ?? []), option])
  }
  return [...groups]
}

/**
 * Manual status change for phase 1 of the customer's requirements: status and
 * sub-status, saved together. The journey and badges follow on refresh.
 */
export function ApplicationStatusControl({ applicationId, studentId, status, subStatus, statuses, subStatuses }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [statusId, setStatusId] = useState(status ? String(status.id) : "")
  const [subStatusId, setSubStatusId] = useState(subStatus ? String(subStatus.id) : NONE)

  const statusGroups = useMemo(() => groupStatusesByStage(withCurrent(statuses, status)), [statuses, status])
  const subStatusGroups = useMemo(() => groupByCategory(withCurrent(subStatuses, subStatus)), [subStatuses, subStatus])

  const changed = statusId !== (status ? String(status.id) : "") || subStatusId !== (subStatus ? String(subStatus.id) : NONE)

  const save = () => {
    startTransition(async () => {
      const result = await updateStudentApplication(applicationId, studentId, {
        status_id: statusId ? Number(statusId) : null,
        sub_status_id: subStatusId === NONE ? null : Number(subStatusId),
      })
      if (result.success) {
        toast.success("Status updated")
        router.refresh()
      } else {
        toast.error(result.error ?? "Could not update the status")
      }
    })
  }

  return (
    <Section title="Change status" plain>
      <div className="space-y-3">
        <div className="space-y-1.5">
          <Label htmlFor="application-status" className="text-xs text-muted-foreground">Status</Label>
          <Select value={statusId} onValueChange={setStatusId} disabled={isPending}>
            <SelectTrigger id="application-status" className="w-full"><SelectValue placeholder="Choose a status" /></SelectTrigger>
            <SelectContent className="max-h-80">
              {statusGroups.map(group => (
                <SelectGroup key={group.key}>
                  <SelectLabel>{group.label}</SelectLabel>
                  {group.statuses.map(s => <SelectItem key={s.id} value={String(s.id)}>{s.label}</SelectItem>)}
                </SelectGroup>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="application-sub-status" className="text-xs text-muted-foreground">Sub-status</Label>
          <Select value={subStatusId} onValueChange={setSubStatusId} disabled={isPending}>
            <SelectTrigger id="application-sub-status" className="w-full"><SelectValue /></SelectTrigger>
            <SelectContent className="max-h-80">
              <SelectItem value={NONE}>None</SelectItem>
              {subStatusGroups.map(([category, options]) => (
                <SelectGroup key={category}>
                  <SelectLabel className="capitalize">{category}</SelectLabel>
                  {options.map(s => <SelectItem key={s.id} value={String(s.id)}>{s.label}</SelectItem>)}
                </SelectGroup>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Button onClick={save} disabled={!changed || !statusId || isPending} size="sm" className="w-full gap-1.5">
          {isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
          Save status
        </Button>
      </div>
    </Section>
  )
}
