"use client"

import { useState, useTransition } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Calendar as CalendarComponent } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Plus, Loader2, CalendarDays } from "lucide-react"
import { createApplicationDeposit } from "@/lib/supabase/actions/student-application-deposits"

const inputStyles = "h-9 bg-background border-border focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-200 text-sm"

function formatDateDisplay(date: Date | undefined) {
  return date ? date.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : null
}

function formatDateValue(date: Date | undefined) {
  return date ? date.toISOString().split("T")[0] : null
}

type Props = {
  applicationId: string
  studentId: string
  onDone: () => void
}

/** Inline form for adding a new deposit to an application */
export function NewDepositForm({ applicationId, studentId, onDone }: Props) {
  const [isPending, startTransition] = useTransition()
  const [depositDate, setDepositDate] = useState<Date | undefined>(new Date())
  const [dateOpen, setDateOpen] = useState(false)
  const [commission, setCommission] = useState(true)

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)

    startTransition(async () => {
      const amount = fd.get("amount") as string
      const discount = fd.get("discount") as string

      await createApplicationDeposit({
        application_id: applicationId,
        deposit_date: formatDateValue(depositDate),
        amount: amount ? parseFloat(amount) : null,
        discount: discount ? parseFloat(discount) : null,
        has_commission: commission,
        remarks: (fd.get("remarks") as string) || null,
      }, studentId)
      onDone()
    })
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-lg border border-dashed border-primary/30 bg-primary/5 p-3 space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Deposit Date</Label>
          <Popover open={dateOpen} onOpenChange={setDateOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" className={`w-full justify-start font-normal ${inputStyles}`}>
                <CalendarDays className="h-3.5 w-3.5 mr-2 text-muted-foreground" />
                {formatDateDisplay(depositDate) ?? <span className="text-muted-foreground">Select</span>}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto overflow-hidden p-0" align="start">
              <CalendarComponent
                mode="single"
                selected={depositDate}
                defaultMonth={depositDate}
                onSelect={(d) => { setDepositDate(d); setDateOpen(false) }}
              />
            </PopoverContent>
          </Popover>
        </div>
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Amount</Label>
          <Input name="amount" type="number" step="0.01" className={inputStyles} placeholder="0.00" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Discount</Label>
          <Input name="discount" type="number" step="0.01" className={inputStyles} placeholder="0.00" />
        </div>
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Remarks</Label>
          <Input name="remarks" className={inputStyles} placeholder="Notes..." />
        </div>
      </div>
      <div className="flex items-center justify-between">
        <label className="flex items-center gap-2 cursor-pointer">
          <Checkbox checked={commission} onCheckedChange={(v) => setCommission(v === true)} />
          <span className="text-sm">Commission</span>
        </label>
        <div className="flex gap-2">
          <Button type="button" variant="ghost" size="sm" onClick={onDone} className="text-xs h-8">Cancel</Button>
          <Button type="submit" size="sm" disabled={isPending} className="text-xs h-8 gap-1">
            {isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Plus className="h-3 w-3" />}
            Add
          </Button>
        </div>
      </div>
    </form>
  )
}
