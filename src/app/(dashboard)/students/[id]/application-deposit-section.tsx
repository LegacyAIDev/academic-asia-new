"use client"

import { useState, useTransition } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Calendar as CalendarComponent } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Loader2, Trash2, Plus, Banknote, CalendarDays } from "lucide-react"
import { deleteApplicationDeposit } from "@/lib/supabase/actions/student-application-deposits"
import { NewDepositForm } from "./application-deposit-form"

export type DepositItem = {
  id: string
  deposit_date: string | null
  amount: number | null
  discount: number | null
  has_commission: boolean | null
  remarks: string | null
}

type Props = {
  applicationId: string
  studentId: string
  deposits: DepositItem[]
  isCreate?: boolean
  depositDate?: Date | undefined
  onDepositDateChange?: (d: Date | undefined) => void
  commission?: boolean
  onCommissionChange?: (v: boolean) => void
}

const inputStyles = "h-9 bg-background border-border focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-200 text-sm"

/** Single deposit row with delete */
function DepositRow({ deposit, studentId }: { deposit: DepositItem; studentId: string }) {
  const [isPending, startTransition] = useTransition()

  const handleDelete = () => {
    if (!confirm("Delete this deposit?")) return
    startTransition(async () => {
      await deleteApplicationDeposit(deposit.id, studentId)
    })
  }

  return (
    <div className="flex items-center gap-3 rounded-lg border bg-card px-3 py-2 text-sm">
      <div className="flex-1 grid grid-cols-4 gap-2 items-center">
        <span className="text-muted-foreground">
          {deposit.deposit_date
            ? new Date(deposit.deposit_date + "T00:00:00").toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })
            : "—"}
        </span>
        <span className="font-medium">{deposit.amount != null ? `$${deposit.amount.toLocaleString()}` : "—"}</span>
        <span className="text-muted-foreground">{deposit.discount != null ? `-$${deposit.discount.toLocaleString()}` : "—"}</span>
        <span className="text-xs">{deposit.has_commission ? "Commission" : "No commission"}</span>
      </div>
      {deposit.remarks && (
        <span className="text-xs text-muted-foreground truncate max-w-[120px]" title={deposit.remarks}>{deposit.remarks}</span>
      )}
      <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive shrink-0" onClick={handleDelete} disabled={isPending}>
        {isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />}
      </Button>
    </div>
  )
}

/** Deposits section — inline fields for create, list+add for edit */
export function ApplicationDepositSection({
  applicationId, studentId, deposits, isCreate,
  depositDate, onDepositDateChange, commission, onCommissionChange,
}: Props) {
  const [showForm, setShowForm] = useState(false)
  const [dateOpen, setDateOpen] = useState(false)

  const formatDateDisplay = (date: Date | undefined) =>
    date ? date.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : null

  return (
    <div className="group">
      <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-500/20 to-emerald-500/5 text-emerald-600">
              <Banknote className="h-4 w-4" />
            </div>
            <span className="text-sm font-semibold text-foreground">
              Deposit {!isCreate && `(${deposits.length})`}
            </span>
          </div>
          {!isCreate && !showForm && (
            <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={() => setShowForm(true)}>
              <Plus className="h-3 w-3" /> Add Deposit
            </Button>
          )}
        </div>

        {/* Create mode: inline form fields using name attrs read by parent */}
        {isCreate && (
          <div className="space-y-3">
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
                    <CalendarComponent mode="single" selected={depositDate} defaultMonth={depositDate} onSelect={(d) => { onDepositDateChange?.(d); setDateOpen(false) }} />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Deposit Amount</Label>
                <Input name="deposit_amount" type="number" step="0.01" className={inputStyles} placeholder="0.00" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Discount</Label>
                <Input name="deposit_discount" type="number" step="0.01" className={inputStyles} placeholder="0.00" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Deposit Remarks</Label>
                <Input name="deposit_remarks" className={inputStyles} placeholder="Notes..." />
              </div>
            </div>
            <label className="flex items-center gap-2 cursor-pointer">
              <Checkbox checked={commission} onCheckedChange={(v) => onCommissionChange?.(v === true)} />
              <span className="text-sm">Commission</span>
            </label>
          </div>
        )}

        {/* Edit mode: existing deposits list + add form */}
        {!isCreate && (
          <div className="space-y-2">
            {deposits.map((d) => (
              <DepositRow key={d.id} deposit={d} studentId={studentId} />
            ))}
            {deposits.length === 0 && !showForm && (
              <p className="text-sm text-muted-foreground text-center py-3">No deposits recorded</p>
            )}
            {showForm && (
              <NewDepositForm applicationId={applicationId} studentId={studentId} onDone={() => setShowForm(false)} />
            )}
          </div>
        )}
      </div>
    </div>
  )
}
