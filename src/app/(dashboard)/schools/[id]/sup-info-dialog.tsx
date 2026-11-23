"use client"

import { DialogCloseButton } from "@/components/forms/dialog-close-button"
import { FormField } from "@/components/forms/form-field"
import { ConfirmDeleteButton } from "@/components/features/confirm-delete-button"
import { useState, useTransition } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
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
  FileText,
  Check,
  Info,
} from "lucide-react"
import {
  createSchoolSupInfo,
  updateSchoolSupInfo,
  deleteSchoolSupInfo,
  type CreateSupInfoInput,
} from "@/lib/supabase/actions/schools"
import { getAcademicYearOptions } from "@/lib/utils"
import type { SupInfoCategory } from "@/lib/supabase/queries/school-supplementary-info"
import { FormSection } from "@/components/forms/form-section"
import { useAddParam } from "@/lib/students/use-add-param"

type SchoolSupplementaryInfo = {
  id: string
  school_id: string
  legacy_info_type: string | null
  category_id: number | null
  category: SupInfoCategory | null
  info: string | null
  school_year: string | null
  remarks: string | null
  assigned_to: string | null
}

type SupInfoDialogProps = {
  schoolId: string
  mode: "create" | "edit"
  supInfo?: SchoolSupplementaryInfo
  trigger?: React.ReactNode
  categories: SupInfoCategory[]
}

/** Floating card section for form grouping */

export function SupInfoDialog({
  schoolId,
  mode,
  supInfo,
  trigger,
  categories,
}: SupInfoDialogProps) {
  const [open, setOpen] = useAddParam(mode === "create" ? "info" : null)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const { options: schoolYearOptions, defaultYear: defaultSchoolYear } = getAcademicYearOptions()

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)

    const formData = new FormData(e.currentTarget)

    const categoryId = formData.get("category_id")
    if (!categoryId) {
      setError("Category is required")
      return
    }

    const input: Omit<CreateSupInfoInput, 'school_id'> = {
      category_id: parseInt(categoryId as string, 10),
      info: (formData.get("info") as string) || null,
      school_year: (formData.get("school_year") as string) || null,
      remarks: (formData.get("remarks") as string) || null,
    }

    startTransition(async () => {
      let result
      if (mode === "create") {
        result = await createSchoolSupInfo({ ...input, school_id: schoolId })
      } else if (supInfo?.id) {
        result = await updateSchoolSupInfo(supInfo.id, schoolId, input)
      }

      if (result?.success) {
        setOpen(false)
      } else {
        setError(result?.error ?? "An error occurred")
      }
    })
  }

  const selectTriggerStyles = "h-10 bg-background border-border focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-200"

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button size="sm" variant="outline" className="h-8 gap-1.5">
            <Plus className="h-3.5 w-3.5" />
            Add background info
          </Button>
        )}
      </DialogTrigger>
      <DialogContent
        className="sm:!max-w-[640px] !max-h-[92vh] !overflow-hidden !p-0 !gap-0 bg-background flex flex-col"
        showCloseButton={false}
      >
        {/* Header */}
        <div className="relative shrink-0 border-b border-border">

          <div className="relative flex items-center gap-3 px-6 py-4">
            <div className="relative">
              <div className="relative flex h-9 w-9 items-center justify-center rounded-md bg-brand-navy/[0.07] text-brand-navy">
                {mode === "create" ? (
                  <Plus className="h-5 w-5" />
                ) : (
                  <FileText className="h-5 w-5" />
                )}
              </div>
            </div>

            <DialogHeader className="flex-1 space-y-1">
              <DialogTitle className="text-lg font-semibold">
                {mode === "create" ? "Add Supplementary Info" : "Edit Supplementary Info"}
              </DialogTitle>
              <p className="text-sm text-muted-foreground">
                {mode === "create"
                  ? "Add additional information for this school"
                  : "Update supplementary information details"}
              </p>
            </DialogHeader>

            <DialogCloseButton onClick={() => setOpen(false)} />
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex flex-col min-h-0 flex-1">
          <div className="flex-1 overflow-y-auto px-6 py-5">
            {/* Error Message */}
            {error && (
              <div className="mb-5 flex items-center gap-3 rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive animate-in slide-in-from-top-2 duration-300">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-destructive/10">
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <span className="font-medium">{error}</span>
              </div>
            )}

            <div className="space-y-5">
              {/* Classification Section */}
              <FormSection icon={Info} title="Classification" accentColor="primary">
                <div className="grid grid-cols-2 gap-4">
                  <FormField label="Category" required>
                    <Select name="category_id" defaultValue={supInfo?.category_id?.toString() ?? ""}>
                      <SelectTrigger className={selectTriggerStyles}>
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map((cat) => (
                          <SelectItem key={cat.id} value={cat.id.toString()}>{cat.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormField>
                  <FormField label="School Year">
                    <Select name="school_year" defaultValue={supInfo?.school_year ?? defaultSchoolYear}>
                      <SelectTrigger className={selectTriggerStyles}>
                        <SelectValue placeholder="Select year" />
                      </SelectTrigger>
                      <SelectContent position="popper">
                        {schoolYearOptions.map((year) => (
                          <SelectItem key={year} value={year}>{year}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormField>
                </div>
              </FormSection>

              {/* Information Content Section */}
              <FormSection icon={FileText} title="Information" accentColor="teal">
                <FormField label="Information Content">
                  <Textarea
                    name="info"
                    placeholder="Enter the supplementary information details..."
                    rows={6}
                    className="resize-none bg-background border-border focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-200"
                    defaultValue={supInfo?.info ?? ""}
                  />
                </FormField>
                <FormField label="Remarks">
                  <Textarea
                    name="remarks"
                    placeholder="Any additional notes or remarks..."
                    rows={3}
                    className="resize-none bg-background border-border focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-200"
                    defaultValue={supInfo?.remarks ?? ""}
                  />
                </FormField>
              </FormSection>
            </div>
          </div>

          {/* Footer */}
          <div className="shrink-0 border-t border-border bg-muted/40 px-6 py-3">
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">
                <span className="text-destructive">*</span> Required field
              </p>
              <div className="flex items-center gap-3">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setOpen(false)}
                  disabled={isPending}
                  className="text-muted-foreground hover:text-foreground"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isPending}
                  className="min-w-[140px] gap-2 bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20 transition-all duration-200"
                >
                  {isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      {mode === "create" ? "Creating..." : "Saving..."}
                    </>
                  ) : (
                    <>
                      {mode === "create" ? <Plus className="h-4 w-4" /> : <Check className="h-4 w-4" />}
                      {mode === "create" ? "Add Info" : "Save Changes"}
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

/** Edit button trigger for existing sup info */
export function EditSupInfoButton({
  supInfo,
  schoolId,
  categories,
}: {
  supInfo: SchoolSupplementaryInfo
  schoolId: string
  categories: SupInfoCategory[]
}) {
  return (
    <SupInfoDialog
      schoolId={schoolId}
      mode="edit"
      supInfo={supInfo}
      categories={categories}
      trigger={
        <Button aria-label="Edit" title="Edit" variant="ghost" size="icon" className="h-8 w-8 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors">
          <Pencil className="h-3.5 w-3.5" />
        </Button>
      }
    />
  )
}

/** Delete sup info dialog */
export function DeleteSupInfoButton({
  supInfoId,
  schoolId,
  categoryLabel,
}: {
  supInfoId: string
  schoolId: string
  categoryLabel: string
}) {
  return (
    <ConfirmDeleteButton
      title="Delete Supplementary Info"
      description={<>Are you sure you want to delete this <strong className="text-foreground">{categoryLabel}</strong> record? This action cannot be undone.</>}
      failMessage="Failed to delete"
      onDelete={() => deleteSchoolSupInfo(supInfoId, schoolId)}
    />
  )
}
