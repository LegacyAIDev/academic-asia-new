"use client"

import { useState, useTransition } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Plus,
  Loader2,
  Pencil,
  Trash2,
  Banknote,
  DollarSign,
  MessageSquare,
  Check,
  ChevronsUpDown,
} from "lucide-react"
import {
  createSchoolFee,
  updateSchoolFee,
  deleteSchoolFee,
  type CreateSchoolFeeInput,
} from "@/lib/supabase/actions/school-fees"
import { getAcademicYearOptions } from "@/lib/utils"
import type { SchoolFeeWithJoins } from "@/lib/supabase/queries/school-fees"

type FeeTypeItem = { id: number; code: string; label: string }

export type FeeReferenceData = { feeTypes: FeeTypeItem[] }

type FeeDialogProps = {
  schoolId: string
  referenceData: FeeReferenceData
  mode: "create" | "edit"
  fee?: SchoolFeeWithJoins
  trigger?: React.ReactNode
}

function FormSection({
  icon: Icon,
  title,
  children,
  accentColor = "primary",
}: {
  icon: React.ElementType
  title: string
  children: React.ReactNode
  accentColor?: "primary" | "teal" | "amber" | "rose"
}) {
  const accentStyles = {
    primary: "from-primary/20 to-primary/5 text-primary",
    teal: "from-teal-500/20 to-teal-500/5 text-teal-600",
    amber: "from-amber-500/20 to-amber-500/5 text-amber-600",
    rose: "from-rose-500/20 to-rose-500/5 text-rose-600",
  }

  return (
    <div className="group">
      <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
        <div className="flex items-center gap-2.5 mb-4">
          <div className={`flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br ${accentStyles[accentColor]}`}>
            <Icon className="h-4 w-4" />
          </div>
          <span className="text-sm font-semibold text-foreground">{title}</span>
        </div>
        <div className="space-y-4">{children}</div>
      </div>
    </div>
  )
}

function FormField({
  label,
  children,
  className = "",
}: {
  label: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <div className={`space-y-2 ${className}`}>
      <Label className="text-xs font-medium text-muted-foreground">{label}</Label>
      {children}
    </div>
  )
}

export function FeeDialog({ schoolId, referenceData, mode, fee, trigger }: FeeDialogProps) {
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const yearLevelOptions = ["All", ...Array.from({ length: 13 }, (_, i) => `Year ${i + 1}`)]
  const initialYearLevels = fee?.year_levels ? fee.year_levels.split(",").map(s => s.trim()) : []
  const [selectedYearLevels, setSelectedYearLevels] = useState<string[]>(initialYearLevels)

  const toggleYearLevel = (level: string) => {
    if (level === "All") {
      setSelectedYearLevels(prev => prev.includes("All") ? [] : ["All"])
    } else {
      setSelectedYearLevels(prev => {
        const without = prev.filter(l => l !== "All")
        return without.includes(level) ? without.filter(l => l !== level) : [...without, level]
      })
    }
  }

  const { feeTypes } = referenceData

  const { options: financialYearOptions, defaultYear: defaultFinancialYear } = getAcademicYearOptions()

  const handleOpenChange = (value: boolean) => {
    setOpen(value)
    if (value) setError(null)
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)
    const formData = new FormData(e.currentTarget)

    const input: Omit<CreateSchoolFeeInput, "school_id"> = {
      financial_year: formData.get("financial_year") as string,
      fee_type_id: parseInt(formData.get("fee_type_id") as string, 10),
      description: formData.get("description") as string,
      amount: parseFloat(formData.get("amount") as string),
      year_levels: selectedYearLevels.length > 0 ? selectedYearLevels.join(",") : null,
      remarks: (formData.get("remarks") as string) || null,
    }

    startTransition(async () => {
      let result
      if (mode === "create") {
        result = await createSchoolFee({ ...input, school_id: schoolId } as CreateSchoolFeeInput)
      } else if (fee?.id) {
        result = await updateSchoolFee(fee.id, schoolId, input)
      }
      if (result?.success) setOpen(false)
      else setError(result?.error ?? "An error occurred")
    })
  }

  const inputStyles = "h-10 bg-background border-border focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-200"
  const selectTriggerStyles = "h-10 bg-background border-border focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-200"

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button size="sm" className="gap-2 shadow-sm bg-primary hover:bg-primary/90 transition-all duration-200">
            <Plus className="h-4 w-4" />
            New Fee
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:!max-w-[560px] !max-h-[92vh] !overflow-hidden !p-0 !gap-0 bg-background flex flex-col" showCloseButton={false}>
        <div className="relative overflow-hidden border-b border-border/50">
          <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-primary/5" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-primary/10 via-transparent to-transparent opacity-60" />
          <div className="relative flex items-center gap-4 px-6 py-5">
            <div className="relative">
              <div className="absolute inset-0 bg-primary/20 rounded-2xl blur-xl" />
              <div className="relative flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-primary/80 text-primary-foreground shadow-lg shadow-primary/25">
                <Banknote className="h-5 w-5" />
              </div>
            </div>
            <DialogHeader className="flex-1 space-y-1">
              <DialogTitle className="text-xl font-semibold tracking-tight">
                {mode === "create" ? "New Fee" : "Edit Fee"}
              </DialogTitle>
              <p className="text-sm text-muted-foreground">
                {mode === "create" ? "Add a new fee for this school" : "Update fee details"}
              </p>
            </DialogHeader>
            <button onClick={() => setOpen(false)} className="h-8 w-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col min-h-0 flex-1">
          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
            {error && (
              <div className="flex items-center gap-3 rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive animate-in slide-in-from-top-2 duration-300">
                <span className="font-medium">{error}</span>
              </div>
            )}

            <FormSection icon={Banknote} title="Fee Details" accentColor="primary">
              <FormField label="Financial Year *">
                <Select name="financial_year" defaultValue={fee?.financial_year ?? defaultFinancialYear} required>
                  <SelectTrigger className={selectTriggerStyles}>
                    <SelectValue placeholder="Select year" />
                  </SelectTrigger>
                  <SelectContent position="popper">
                    {financialYearOptions.map((year) => (
                      <SelectItem key={year} value={year}>{year}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormField>
              <FormField label="Fee Type *">
                <Select name="fee_type_id" defaultValue={fee?.fee_type_id?.toString() ?? ""} required>
                  <SelectTrigger className={selectTriggerStyles}><SelectValue placeholder="Select fee type" /></SelectTrigger>
                  <SelectContent>
                    {feeTypes.map((ft) => (<SelectItem key={ft.id} value={ft.id.toString()}>{ft.label}</SelectItem>))}
                  </SelectContent>
                </Select>
              </FormField>
              <FormField label="Description *">
                <Input name="description" className={inputStyles} defaultValue={fee?.description ?? ""} placeholder="e.g. Year 12" required />
              </FormField>
            </FormSection>

            <FormSection icon={DollarSign} title="Amount & Payment" accentColor="teal">
              <FormField label="Years">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" type="button" className={`${inputStyles} w-full justify-between font-normal`}>
                      <span className="truncate">
                        {selectedYearLevels.length === 0
                          ? "Select years"
                          : selectedYearLevels.join(", ")}
                      </span>
                      <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                    <div className="max-h-[240px] overflow-y-auto p-2 space-y-1">
                      {yearLevelOptions.map((level) => (
                        <label
                          key={level}
                          className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm cursor-pointer hover:bg-muted transition-colors"
                        >
                          <Checkbox
                            checked={selectedYearLevels.includes(level)}
                            onCheckedChange={() => toggleYearLevel(level)}
                          />
                          {level}
                        </label>
                      ))}
                    </div>
                  </PopoverContent>
                </Popover>
              </FormField>
              <FormField label="Amount in GBP per annum*">
                <Input name="amount" type="number" step="0.01" min="0" className={inputStyles} defaultValue={fee?.amount ?? ""} placeholder="e.g. 1500.00" required />
              </FormField>
            </FormSection>

            <FormSection icon={MessageSquare} title="Remarks" accentColor="rose">
              <FormField label="Remarks">
                <Textarea name="remarks" rows={4} className="resize-none bg-background border-border focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-200" defaultValue={fee?.remarks ?? ""} placeholder="Additional notes about this fee..." />
              </FormField>
            </FormSection>
          </div>

          <div className="border-t border-border bg-muted/50 px-6 py-4">
            <div className="flex items-center justify-end gap-3">
              <Button type="button" variant="ghost" onClick={() => setOpen(false)} disabled={isPending} className="text-muted-foreground hover:text-foreground">Cancel</Button>
              <Button type="submit" disabled={isPending} className="min-w-[140px] gap-2 bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20 transition-all duration-200">
                {isPending ? (<><Loader2 className="h-4 w-4 animate-spin" />{mode === "create" ? "Creating..." : "Saving..."}</>) : (<>{mode === "create" ? <Plus className="h-4 w-4" /> : <Check className="h-4 w-4" />}{mode === "create" ? "Create Fee" : "Save Changes"}</>)}
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export function EditFeeButton({ fee, schoolId, referenceData }: { fee: SchoolFeeWithJoins; schoolId: string; referenceData: FeeReferenceData }) {
  return (
    <FeeDialog schoolId={schoolId} referenceData={referenceData} mode="edit" fee={fee}
      trigger={<Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"><Pencil className="h-3.5 w-3.5" /></Button>}
    />
  )
}

export function DeleteFeeButton({ feeId, schoolId, label }: { feeId: string; schoolId: string; label: string }) {
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const handleDelete = () => {
    setError(null)
    startTransition(async () => {
      const result = await deleteSchoolFee(feeId, schoolId)
      if (result.success) setOpen(false)
      else setError(result.error ?? "Failed to delete fee")
    })
  }

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors" onClick={() => setOpen(true)}>
        <Trash2 className="h-3.5 w-3.5" />
      </Button>
      <AlertDialogContent className="sm:max-w-[420px]">
        <AlertDialogHeader>
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-destructive/10"><Trash2 className="h-5 w-5 text-destructive" /></div>
            <div className="space-y-1.5">
              <AlertDialogTitle className="text-lg">Delete Fee</AlertDialogTitle>
              <AlertDialogDescription>Are you sure you want to delete <strong className="text-foreground">{label}</strong>? This action cannot be undone.</AlertDialogDescription>
            </div>
          </div>
        </AlertDialogHeader>
        {error && <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">{error}</div>}
        <AlertDialogFooter className="gap-2 sm:gap-2">
          <AlertDialogCancel disabled={isPending} className="rounded-lg">Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={handleDelete} disabled={isPending} className="rounded-lg bg-destructive text-destructive-foreground hover:bg-destructive/90 gap-2">
            {isPending ? (<><Loader2 className="h-4 w-4 animate-spin" />Deleting...</>) : (<><Trash2 className="h-4 w-4" />Delete</>)}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
