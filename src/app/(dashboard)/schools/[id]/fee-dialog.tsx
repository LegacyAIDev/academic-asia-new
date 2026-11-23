"use client"

import { DialogCloseButton } from "@/components/forms/dialog-close-button"
import { FormField } from "@/components/forms/form-field"
import { ConfirmDeleteButton } from "@/components/features/confirm-delete-button"
import { useRef, useState, useTransition } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
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
  Banknote,
  DollarSign,
  MessageSquare,
  Check,
  ChevronsUpDown,
  Paperclip,
} from "lucide-react"
import {
  createSchoolFee,
  updateSchoolFee,
  deleteSchoolFee,
  type CreateSchoolFeeInput,
} from "@/lib/supabase/actions/school-fees"
import { getAcademicYearOptions } from "@/lib/utils"
import type { SchoolFeeWithJoins } from "@/lib/supabase/queries/school-fees"
import { AttachmentField, type AttachmentFieldHandle } from "@/components/features/attachment-field"
import type { AttachmentRecord } from "@/lib/supabase/queries/record-attachments"
import { FormSection } from "@/components/forms/form-section"
import { useAddParam } from "@/lib/students/use-add-param"

type FeeTypeItem = { id: number; code: string; label: string }

export type FeeReferenceData = { feeTypes: FeeTypeItem[] }

type FeeDialogProps = {
  schoolId: string
  referenceData: FeeReferenceData
  mode: "create" | "edit"
  fee?: SchoolFeeWithJoins
  trigger?: React.ReactNode
  attachments?: AttachmentRecord[]
  canWrite?: boolean
}


export function FeeDialog({ schoolId, referenceData, mode, fee, trigger, attachments = [], canWrite = true }: FeeDialogProps) {
  const [open, setOpen] = useAddParam(mode === "create" ? "fee" : null)
  const attachRef = useRef<AttachmentFieldHandle>(null)
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
        // Staged attachments could not be linked before the row existed.
        if (result?.success && result.data?.id) {
          const failed = await attachRef.current?.flush(result.data.id) ?? 0
          if (failed > 0) setError(`Saved, but ${failed} attachment(s) failed to upload`)
        }
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
          <Button size="sm" variant="outline" className="h-8 gap-1.5">
            <Plus className="h-3.5 w-3.5" />
            Add fee
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:!max-w-[560px] !max-h-[92vh] !overflow-hidden !p-0 !gap-0 bg-background flex flex-col" showCloseButton={false}>
        <div className="relative shrink-0 border-b border-border">
          <div className="relative flex items-center gap-3 px-6 py-4">
            <div className="relative">
              <div className="relative flex h-9 w-9 items-center justify-center rounded-md bg-brand-navy/[0.07] text-brand-navy">
                <Banknote className="h-5 w-5" />
              </div>
            </div>
            <DialogHeader className="flex-1 space-y-1">
              <DialogTitle className="text-lg font-semibold">
                {mode === "create" ? "New Fee" : "Edit Fee"}
              </DialogTitle>
              <p className="text-sm text-muted-foreground">
                {mode === "create" ? "Add a new fee for this school" : "Update fee details"}
              </p>
            </DialogHeader>
            <DialogCloseButton onClick={() => setOpen(false)} />
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

            <FormSection icon={Paperclip} title="Attachments" accentColor="rose">
              <FormField label="Fee schedule (file or link)">
                <AttachmentField
                  ref={attachRef}
                  attachPoint="school_fee"
                  ownerId={schoolId}
                  attachableId={mode === "edit" ? fee?.id ?? null : null}
                  attachments={attachments}
                  canWrite={canWrite}
                />
              </FormField>
            </FormSection>

            <FormSection icon={MessageSquare} title="Remarks" accentColor="rose">
              <FormField label="Remarks">
                <Textarea name="remarks" rows={4} className="resize-none bg-background border-border focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-200" defaultValue={fee?.remarks ?? ""} placeholder="Additional notes about this fee..." />
              </FormField>
            </FormSection>
          </div>

          <div className="shrink-0 border-t border-border bg-muted/40 px-6 py-3">
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

export function EditFeeButton({ fee, schoolId, referenceData, attachments = [], canWrite = true }: { fee: SchoolFeeWithJoins; schoolId: string; referenceData: FeeReferenceData; attachments?: AttachmentRecord[]; canWrite?: boolean }) {
  return (
    <FeeDialog schoolId={schoolId} referenceData={referenceData} mode="edit" fee={fee} attachments={attachments} canWrite={canWrite}
      trigger={<Button aria-label="Edit" title="Edit" variant="ghost" size="icon" className="h-8 w-8 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"><Pencil className="h-3.5 w-3.5" /></Button>}
    />
  )
}

export function DeleteFeeButton({ feeId, schoolId, label }: { feeId: string; schoolId: string; label: string }) {
  return (
    <ConfirmDeleteButton
      title="Delete Fee"
      description={<>Are you sure you want to delete <strong className="text-foreground">{label}</strong>? This action cannot be undone.</>}
      failMessage="Failed to delete fee"
      onDelete={() => deleteSchoolFee(feeId, schoolId)}
    />
  )
}
