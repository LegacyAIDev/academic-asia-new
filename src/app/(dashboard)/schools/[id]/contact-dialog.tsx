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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import {
  Plus,
  Loader2,
  Pencil,
  Trash2,
  Contact,
  Phone,
  MapPin,
  MessageSquare,
  Check,
} from "lucide-react"
import {
  createSchoolContact,
  updateSchoolContact,
  deleteSchoolContact,
  type CreateSchoolContactInput,
} from "@/lib/supabase/actions/school-contacts"
import type { SchoolContactWithJoins } from "@/lib/supabase/queries/school-contacts"

type ContactDialogProps = {
  schoolId: string
  mode: "create" | "edit"
  contact?: SchoolContactWithJoins
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

export function SchoolContactDialog({ schoolId, mode, contact, trigger }: ContactDialogProps) {
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [isActive, setIsActive] = useState(contact?.is_active ?? true)

  const handleOpenChange = (value: boolean) => {
    setOpen(value)
    if (value) setError(null)
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)
    const formData = new FormData(e.currentTarget)

    const input: Omit<CreateSchoolContactInput, "school_id"> = {
      title: (formData.get("title") as string) || null,
      first_name: (formData.get("first_name") as string) || null,
      surname: (formData.get("surname") as string) || null,
      position: (formData.get("position") as string) || null,
      gender: (formData.get("gender") as string) || null,
      telephone: (formData.get("telephone") as string) || null,
      mobile: (formData.get("mobile") as string) || null,
      fax: (formData.get("fax") as string) || null,
      email_1: (formData.get("email_1") as string) || null,
      email_2: (formData.get("email_2") as string) || null,
      email_3: (formData.get("email_3") as string) || null,
      address_1: (formData.get("address_1") as string) || null,
      address_2: (formData.get("address_2") as string) || null,
      priority: formData.get("priority") ? parseInt(formData.get("priority") as string, 10) : null,
      responsible: (formData.get("responsible") as string) || null,
      remarks: (formData.get("remarks") as string) || null,
      is_active: isActive,
    }

    startTransition(async () => {
      let result
      if (mode === "create") {
        result = await createSchoolContact({ ...input, school_id: schoolId } as CreateSchoolContactInput)
      } else if (contact?.id) {
        result = await updateSchoolContact(contact.id, schoolId, input)
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
            Add Contact
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
                <Contact className="h-5 w-5" />
              </div>
            </div>
            <DialogHeader className="flex-1 space-y-1">
              <DialogTitle className="text-xl font-semibold tracking-tight">
                {mode === "create" ? "Add Contact" : "Edit Contact"}
              </DialogTitle>
              <p className="text-sm text-muted-foreground">
                {mode === "create" ? "Add a contact person for this school" : "Update contact details"}
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

            <FormSection icon={Contact} title="Person Details" accentColor="primary">
              <div className="grid grid-cols-3 gap-4">
                <FormField label="Title">
                  <Select name="title" defaultValue={contact?.title ?? ""}>
                    <SelectTrigger className={selectTriggerStyles}>
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent position="popper">
                      <SelectItem value="Mr">Mr</SelectItem>
                      <SelectItem value="Mrs">Mrs</SelectItem>
                      <SelectItem value="Ms">Ms</SelectItem>
                      <SelectItem value="Miss">Miss</SelectItem>
                      <SelectItem value="Dr">Dr</SelectItem>
                      <SelectItem value="Prof">Prof</SelectItem>
                      <SelectItem value="Rev">Rev</SelectItem>
                    </SelectContent>
                  </Select>
                </FormField>
                <FormField label="First Name">
                  <Input name="first_name" className={inputStyles} defaultValue={contact?.first_name ?? ""} placeholder="First name" />
                </FormField>
                <FormField label="Surname">
                  <Input name="surname" className={inputStyles} defaultValue={contact?.surname ?? ""} placeholder="Surname" />
                </FormField>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <FormField label="Gender">
                  <Select name="gender" defaultValue={contact?.gender ?? ""}>
                    <SelectTrigger className={selectTriggerStyles}>
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent position="popper">
                      <SelectItem value="M">Male</SelectItem>
                      <SelectItem value="F">Female</SelectItem>
                    </SelectContent>
                  </Select>
                </FormField>
                <FormField label="Position">
                  <Input name="position" className={inputStyles} defaultValue={contact?.position ?? ""} placeholder="e.g. Head of Admissions" />
                </FormField>
                <FormField label="Priority">
                  <Input name="priority" type="number" min={1} max={99} className={inputStyles} defaultValue={contact?.priority ?? ""} placeholder="1 = highest" />
                </FormField>
              </div>
              <FormField label="Responsible For">
                <Input name="responsible" className={inputStyles} defaultValue={contact?.responsible ?? ""} placeholder="Area of responsibility" />
              </FormField>
            </FormSection>

            <FormSection icon={Phone} title="Contact Information" accentColor="teal">
              <div className="grid grid-cols-3 gap-4">
                <FormField label="Telephone">
                  <Input name="telephone" className={inputStyles} defaultValue={contact?.telephone ?? ""} placeholder="Phone number" />
                </FormField>
                <FormField label="Mobile">
                  <Input name="mobile" className={inputStyles} defaultValue={contact?.mobile ?? ""} placeholder="Mobile number" />
                </FormField>
                <FormField label="Fax">
                  <Input name="fax" className={inputStyles} defaultValue={contact?.fax ?? ""} placeholder="Fax number" />
                </FormField>
              </div>
              <div className="grid grid-cols-1 gap-4">
                <FormField label="Email (Primary)">
                  <Input name="email_1" type="email" className={inputStyles} defaultValue={contact?.email_1 ?? ""} placeholder="primary@email.com" />
                </FormField>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <FormField label="Email (Secondary)">
                  <Input name="email_2" type="email" className={inputStyles} defaultValue={contact?.email_2 ?? ""} placeholder="secondary@email.com" />
                </FormField>
                <FormField label="Email (Other)">
                  <Input name="email_3" type="email" className={inputStyles} defaultValue={contact?.email_3 ?? ""} placeholder="other@email.com" />
                </FormField>
              </div>
            </FormSection>

            <FormSection icon={MapPin} title="Address" accentColor="amber">
              <FormField label="Address Line 1">
                <Input name="address_1" className={inputStyles} defaultValue={contact?.address_1 ?? ""} placeholder="Street address" />
              </FormField>
              <FormField label="Address Line 2">
                <Input name="address_2" className={inputStyles} defaultValue={contact?.address_2 ?? ""} placeholder="Additional address" />
              </FormField>
            </FormSection>

            <FormSection icon={MessageSquare} title="Remarks" accentColor="rose">
              <FormField label="Remarks">
                <Textarea name="remarks" rows={3} className="resize-none bg-background border-border focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-200" defaultValue={contact?.remarks ?? ""} placeholder="Additional notes..." />
              </FormField>
            </FormSection>

            <div className="flex items-center justify-between rounded-lg border border-border p-3">
              <div className="space-y-0.5">
                <Label className="text-sm font-medium">Active Status</Label>
                <p className="text-xs text-muted-foreground">Mark as inactive if no longer at this school</p>
              </div>
              <Switch checked={isActive} onCheckedChange={setIsActive} />
            </div>
          </div>

          <div className="border-t border-border bg-muted/50 px-6 py-4">
            <div className="flex items-center justify-end gap-3">
              <Button type="button" variant="ghost" onClick={() => setOpen(false)} disabled={isPending} className="text-muted-foreground hover:text-foreground">Cancel</Button>
              <Button type="submit" disabled={isPending} className="min-w-[140px] gap-2 bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20 transition-all duration-200">
                {isPending ? (<><Loader2 className="h-4 w-4 animate-spin" />{mode === "create" ? "Creating..." : "Saving..."}</>) : (<>{mode === "create" ? <Plus className="h-4 w-4" /> : <Check className="h-4 w-4" />}{mode === "create" ? "Add Contact" : "Save Changes"}</>)}
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export function EditSchoolContactButton({ contact, schoolId }: { contact: SchoolContactWithJoins; schoolId: string }) {
  return (
    <SchoolContactDialog schoolId={schoolId} mode="edit" contact={contact}
      trigger={<Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"><Pencil className="h-3.5 w-3.5" /></Button>}
    />
  )
}

export function DeleteSchoolContactButton({ contactId, schoolId, label }: { contactId: string; schoolId: string; label: string }) {
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const handleDelete = () => {
    setError(null)
    startTransition(async () => {
      const result = await deleteSchoolContact(contactId, schoolId)
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
              <AlertDialogTitle className="text-lg">Delete Contact</AlertDialogTitle>
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
