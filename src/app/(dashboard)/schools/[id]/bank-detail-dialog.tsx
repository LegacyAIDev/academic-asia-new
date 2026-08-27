"use client"

import { useRef, useState, useTransition } from "react"
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
  Landmark,
  CreditCard,
  MessageSquare,
  Check,
  Paperclip,
} from "lucide-react"
import {
  createSchoolBankDetail,
  updateSchoolBankDetail,
  deleteSchoolBankDetail,
  type CreateBankDetailInput,
} from "@/lib/supabase/actions/school-bank-details"
import type { SchoolBankDetailWithJoins, BankAccountType, Currency } from "@/lib/supabase/queries/school-bank-details"
import { AttachmentField, type AttachmentFieldHandle } from "@/components/features/attachment-field"
import type { AttachmentRecord } from "@/lib/supabase/queries/record-attachments"

export type BankReferenceData = {
  accountTypes: BankAccountType[]
  currencies: Currency[]
}

type BankDetailDialogProps = {
  schoolId: string
  referenceData: BankReferenceData
  mode: "create" | "edit"
  bankDetail?: SchoolBankDetailWithJoins
  trigger?: React.ReactNode
  attachments?: AttachmentRecord[]
  canWrite?: boolean
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

export function BankDetailDialog({ schoolId, referenceData, mode, bankDetail, trigger, attachments = [], canWrite = true }: BankDetailDialogProps) {
  const [open, setOpen] = useState(false)
  const attachRef = useRef<AttachmentFieldHandle>(null)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const { accountTypes, currencies } = referenceData

  const handleOpenChange = (value: boolean) => {
    setOpen(value)
    if (value) setError(null)
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)
    const formData = new FormData(e.currentTarget)

    const input: Omit<CreateBankDetailInput, "school_id"> = {
      account_type_id: formData.get("account_type_id") ? parseInt(formData.get("account_type_id") as string, 10) : null,
      currency_id: formData.get("currency_id") ? parseInt(formData.get("currency_id") as string, 10) : null,
      bank_name: (formData.get("bank_name") as string) || null,
      account_number: (formData.get("account_number") as string) || null,
      bank_address: (formData.get("bank_address") as string) || null,
      account_holder: (formData.get("account_holder") as string) || null,
      swift_code: (formData.get("swift_code") as string) || null,
      sort_code: (formData.get("sort_code") as string) || null,
      iban_number: (formData.get("iban_number") as string) || null,
      billing_name: (formData.get("billing_name") as string) || null,
      remarks: (formData.get("remarks") as string) || null,
    }

    startTransition(async () => {
      let result
      if (mode === "create") {
        result = await createSchoolBankDetail({ ...input, school_id: schoolId } as CreateBankDetailInput)
        // Staged attachments could not be linked before the row existed.
        if (result?.success && result.data?.id) {
          const failed = await attachRef.current?.flush(result.data.id) ?? 0
          if (failed > 0) setError(`Saved, but ${failed} attachment(s) failed to upload`)
        }
      } else if (bankDetail?.id) {
        result = await updateSchoolBankDetail(bankDetail.id, schoolId, input)
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
            Add Bank
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:!max-w-[640px] !max-h-[92vh] !overflow-hidden !p-0 !gap-0 bg-background flex flex-col" showCloseButton={false}>
        <div className="relative overflow-hidden border-b border-border/50">
          <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-primary/5" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-primary/10 via-transparent to-transparent opacity-60" />
          <div className="relative flex items-center gap-4 px-6 py-5">
            <div className="relative">
              <div className="absolute inset-0 bg-primary/20 rounded-2xl blur-xl" />
              <div className="relative flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-primary/80 text-primary-foreground shadow-lg shadow-primary/25">
                <Landmark className="h-5 w-5" />
              </div>
            </div>
            <DialogHeader className="flex-1 space-y-1">
              <DialogTitle className="text-xl font-semibold tracking-tight">
                {mode === "create" ? "Add Bank Details" : "Edit Bank Details"}
              </DialogTitle>
              <p className="text-sm text-muted-foreground">
                {mode === "create" ? "Add banking information for this school" : "Update bank account details"}
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

            <FormSection icon={Landmark} title="Account Classification" accentColor="primary">
              <div className="grid grid-cols-2 gap-4">
                <FormField label="Account Type">
                  <Select name="account_type_id" defaultValue={bankDetail?.account_type_id?.toString() ?? ""}>
                    <SelectTrigger className={selectTriggerStyles}>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent position="popper">
                      {accountTypes.map((t) => (
                        <SelectItem key={t.id} value={t.id.toString()}>{t.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormField>
                <FormField label="Currency">
                  <Select name="currency_id" defaultValue={bankDetail?.currency_id?.toString() ?? ""}>
                    <SelectTrigger className={selectTriggerStyles}>
                      <SelectValue placeholder="Select currency" />
                    </SelectTrigger>
                    <SelectContent position="popper">
                      {currencies.map((c) => (
                        <SelectItem key={c.id} value={c.id.toString()}>{c.symbol ? `${c.symbol} — ${c.label}` : c.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormField>
              </div>
            </FormSection>

            <FormSection icon={CreditCard} title="Bank Information" accentColor="teal">
              <div className="grid grid-cols-2 gap-4">
                <FormField label="Bank Name">
                  <Input name="bank_name" className={inputStyles} defaultValue={bankDetail?.bank_name ?? ""} placeholder="e.g. HSBC" />
                </FormField>
                <FormField label="Account Holder">
                  <Input name="account_holder" className={inputStyles} defaultValue={bankDetail?.account_holder ?? ""} placeholder="Beneficiary name" />
                </FormField>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <FormField label="Account Number">
                  <Input name="account_number" className={inputStyles} defaultValue={bankDetail?.account_number ?? ""} placeholder="Account number" />
                </FormField>
                <FormField label="Sort Code">
                  <Input name="sort_code" className={inputStyles} defaultValue={bankDetail?.sort_code ?? ""} placeholder="e.g. 40-47-84" />
                </FormField>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <FormField label="SWIFT / BIC">
                  <Input name="swift_code" className={inputStyles} defaultValue={bankDetail?.swift_code ?? ""} placeholder="SWIFT code" />
                </FormField>
                <FormField label="IBAN">
                  <Input name="iban_number" className={inputStyles} defaultValue={bankDetail?.iban_number ?? ""} placeholder="IBAN number" />
                </FormField>
              </div>
              <FormField label="Bank Address">
                <Input name="bank_address" className={inputStyles} defaultValue={bankDetail?.bank_address ?? ""} placeholder="Bank branch address" />
              </FormField>
              <FormField label="Billing Name">
                <Input name="billing_name" className={inputStyles} defaultValue={bankDetail?.billing_name ?? ""} placeholder="Billing name (if different from school)" />
              </FormField>
            </FormSection>

            <FormSection icon={Paperclip} title="Attachments" accentColor="rose">
              <FormField label="Bank document (file or link)">
                <AttachmentField
                  ref={attachRef}
                  attachPoint="school_bank_detail"
                  ownerId={schoolId}
                  attachableId={mode === "edit" ? bankDetail?.id ?? null : null}
                  attachments={attachments}
                  canWrite={canWrite}
                />
              </FormField>
            </FormSection>

            <FormSection icon={MessageSquare} title="Remarks" accentColor="rose">
              <FormField label="Remarks">
                <Textarea name="remarks" rows={3} className="resize-none bg-background border-border focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-200" defaultValue={bankDetail?.remarks ?? ""} placeholder="Additional notes..." />
              </FormField>
            </FormSection>
          </div>

          <div className="border-t border-border bg-muted/50 px-6 py-4">
            <div className="flex items-center justify-end gap-3">
              <Button type="button" variant="ghost" onClick={() => setOpen(false)} disabled={isPending} className="text-muted-foreground hover:text-foreground">Cancel</Button>
              <Button type="submit" disabled={isPending} className="min-w-[140px] gap-2 bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20 transition-all duration-200">
                {isPending ? (<><Loader2 className="h-4 w-4 animate-spin" />{mode === "create" ? "Creating..." : "Saving..."}</>) : (<>{mode === "create" ? <Plus className="h-4 w-4" /> : <Check className="h-4 w-4" />}{mode === "create" ? "Add Bank" : "Save Changes"}</>)}
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export function EditBankDetailButton({ bankDetail, schoolId, referenceData, attachments = [], canWrite = true }: { bankDetail: SchoolBankDetailWithJoins; schoolId: string; referenceData: BankReferenceData; attachments?: AttachmentRecord[]; canWrite?: boolean }) {
  return (
    <BankDetailDialog schoolId={schoolId} referenceData={referenceData} mode="edit" bankDetail={bankDetail} attachments={attachments} canWrite={canWrite}
      trigger={<Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"><Pencil className="h-3.5 w-3.5" /></Button>}
    />
  )
}

export function DeleteBankDetailButton({ detailId, schoolId, label }: { detailId: string; schoolId: string; label: string }) {
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const handleDelete = () => {
    setError(null)
    startTransition(async () => {
      const result = await deleteSchoolBankDetail(detailId, schoolId)
      if (result.success) setOpen(false)
      else setError(result.error ?? "Failed to delete")
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
              <AlertDialogTitle className="text-lg">Delete Bank Details</AlertDialogTitle>
              <AlertDialogDescription>Are you sure you want to delete <strong className="text-foreground">{label}</strong> bank details? This action cannot be undone.</AlertDialogDescription>
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
