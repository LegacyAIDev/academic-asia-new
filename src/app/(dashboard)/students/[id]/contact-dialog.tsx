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
import { PhoneInput } from "@/components/ui/phone-input"
import {
  Plus,
  Loader2,
  Pencil,
  Trash2,
  User,
  Phone,
  MapPin,
  MessageSquare,
  UserPlus,
  Check,
  Heart,
  Copy,
} from "lucide-react"
import {
  createStudentContact,
  updateStudentContact,
  deleteStudentContact,
  type CreateContactInput,
} from "@/lib/supabase/actions/students"

type ReferenceItem = {
  id: number
  code: string
  label: string
}

type ContactWithRelations = {
  id: string
  student_id: string
  first_name: string | null
  surname: string | null
  mobile: string | null
  telephone: string | null
  fax: string | null
  email_1: string | null
  email_2: string | null
  email_3: string | null
  address_1: string | null
  address_2: string | null
  occupation: string | null
  office_telephone: string | null
  office_fax: string | null
  priority: number | null
  gender: string | null
  status: string | null
  remarks: string | null
  relationship_id: number | null
  title_id: number | null
  relationship: { id: number; code: string; label: string } | null
  title: { id: number; code: string; label: string } | null
}

type ContactDialogProps = {
  studentId: string
  referenceData: {
    relationships: ReferenceItem[]
    titles: ReferenceItem[]
  }
  mode: "create" | "edit"
  contact?: ContactWithRelations
  trigger?: React.ReactNode
  studentAddress?: string | null
}

/** Floating card section for form grouping with visual indicator */
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
      {/* Section card */}
      <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
        {/* Section header */}
        <div className="flex items-center gap-2.5 mb-4">
          <div className={`flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br ${accentStyles[accentColor]}`}>
            <Icon className="h-4 w-4" />
          </div>
          <span className="text-sm font-semibold text-foreground">
            {title}
          </span>
        </div>
        {/* Section content */}
        <div className="space-y-4">
          {children}
        </div>
      </div>
    </div>
  )
}

/** Clean form field with label */
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
      <Label className="text-xs font-medium text-muted-foreground">
        {label}
      </Label>
      {children}
    </div>
  )
}

export function ContactDialog({
  studentId,
  referenceData,
  mode,
  contact,
  trigger,
  studentAddress,
}: ContactDialogProps) {
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [address, setAddress] = useState(contact?.address_1 ?? "")

  const { relationships, titles } = referenceData

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)

    const formData = new FormData(e.currentTarget)

    const input: Omit<CreateContactInput, 'student_id'> = {
      relationship_id: formData.get("relationship_id") ? parseInt(formData.get("relationship_id") as string, 10) : null,
      title_id: formData.get("title_id") ? parseInt(formData.get("title_id") as string, 10) : null,
      surname: (formData.get("surname") as string) || null,
      first_name: (formData.get("first_name") as string) || null,
      gender: (formData.get("gender") as string) || null,
      telephone: (formData.get("telephone") as string) || null,
      mobile: (formData.get("mobile") as string) || null,
      fax: (formData.get("fax") as string) || null,
      email_1: (formData.get("email_1") as string) || null,
      address_1: address || null,
      occupation: (formData.get("occupation") as string) || null,
      office_telephone: (formData.get("office_telephone") as string) || null,
      priority: formData.get("priority") ? parseInt(formData.get("priority") as string, 10) : null,
      remarks: (formData.get("remarks") as string) || null,
    }

    startTransition(async () => {
      let result
      if (mode === "create") {
        result = await createStudentContact({ ...input, student_id: studentId })
      } else if (contact?.id) {
        result = await updateStudentContact(contact.id, studentId, input)
      }

      if (result?.success) {
        setOpen(false)
      } else {
        setError(result?.error ?? "An error occurred")
      }
    })
  }

  const inputStyles = "h-10 bg-background border-border focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-200"
  const selectTriggerStyles = "h-10 bg-background border-border focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-200"

  return (
    <Dialog open={open} onOpenChange={(v) => {
      setOpen(v)
      if (v) setAddress(contact?.address_1 ?? "")
    }}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button size="sm" className="gap-2 shadow-sm bg-primary hover:bg-primary/90 transition-all duration-200">
            <Plus className="h-4 w-4" />
            Add Contact
          </Button>
        )}
      </DialogTrigger>
      <DialogContent
        className="sm:!max-w-[560px] !max-h-[92vh] !overflow-hidden !p-0 !gap-0 bg-background flex flex-col"
        showCloseButton={false}
      >
        {/* Elegant Header */}
        <div className="relative overflow-hidden border-b border-border/50">
          {/* Subtle gradient background */}
          <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-primary/5" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-primary/10 via-transparent to-transparent opacity-60" />

          <div className="relative flex items-center gap-4 px-6 py-5">
            {/* Icon with glow effect */}
            <div className="relative">
              <div className="absolute inset-0 bg-primary/20 rounded-2xl blur-xl" />
              <div className="relative flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-primary/80 text-primary-foreground shadow-lg shadow-primary/25">
                {mode === "create" ? (
                  <UserPlus className="h-5 w-5" />
                ) : (
                  <User className="h-5 w-5" />
                )}
              </div>
            </div>

            <DialogHeader className="flex-1 space-y-1">
              <DialogTitle className="text-xl font-semibold tracking-tight">
                {mode === "create" ? "Add New Contact" : "Edit Contact"}
              </DialogTitle>
              <p className="text-sm text-muted-foreground">
                {mode === "create"
                  ? "Add a family member, guardian, or emergency contact"
                  : "Update contact details and information"}
              </p>
            </DialogHeader>

            {/* Close button */}
            <button
              onClick={() => setOpen(false)}
              className="h-8 w-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Scrollable Form Area */}
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
              <FormSection icon={Heart} title="Relationship" accentColor="rose">
                <div className="grid grid-cols-2 gap-3">
                  <FormField label="Relationship *">
                    <Select name="relationship_id" defaultValue={contact?.relationship_id?.toString() ?? ""}>
                      <SelectTrigger className={selectTriggerStyles}>
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        {relationships.map((rel) => (
                          <SelectItem key={rel.id} value={rel.id.toString()}>{rel.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormField>
                  <FormField label="Priority">
                    <Select name="priority" defaultValue={contact?.priority?.toString() ?? ""}>
                      <SelectTrigger className={selectTriggerStyles}>
                        <SelectValue placeholder="Select" />
                      </SelectTrigger>
                      <SelectContent>
                        {[1, 2, 3, 4, 5].map((p) => (
                          <SelectItem key={p} value={p.toString()}>
                            {p === 1 ? "1 — Primary" : p === 2 ? "2 — Secondary" : `${p}`}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormField>
                </div>
              </FormSection>

              <FormSection icon={User} title="Personal Details" accentColor="primary">
                <div className="grid grid-cols-3 gap-3">
                  <FormField label="Title">
                    <Select name="title_id" defaultValue={contact?.title_id?.toString() ?? ""}>
                      <SelectTrigger className={selectTriggerStyles}>
                        <SelectValue placeholder="—" />
                      </SelectTrigger>
                      <SelectContent>
                        {titles.map((t) => (
                          <SelectItem key={t.id} value={t.id.toString()}>{t.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormField>
                  <FormField label="First Name">
                    <Input name="first_name" className={inputStyles} defaultValue={contact?.first_name ?? ""} placeholder="John" />
                  </FormField>
                  <FormField label="Surname">
                    <Input name="surname" className={inputStyles} defaultValue={contact?.surname ?? ""} placeholder="Smith" />
                  </FormField>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <FormField label="Gender">
                    <Select name="gender" defaultValue={contact?.gender ?? ""}>
                      <SelectTrigger className={selectTriggerStyles}>
                        <SelectValue placeholder="—" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="M">Male</SelectItem>
                        <SelectItem value="F">Female</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormField>
                  <FormField label="Occupation">
                    <Input name="occupation" className={inputStyles} defaultValue={contact?.occupation ?? ""} placeholder="e.g. Doctor, Engineer" />
                  </FormField>
                </div>
              </FormSection>

              <FormSection icon={Phone} title="Contact Details" accentColor="teal">
                <FormField label="Mobile">
                  <PhoneInput name="mobile" defaultValue={contact?.mobile ?? ""} defaultCountryCode="852" placeholder="9XXX XXXX" />
                </FormField>
                <FormField label="Telephone">
                  <PhoneInput name="telephone" defaultValue={contact?.telephone ?? ""} defaultCountryCode="852" placeholder="2XXX XXXX" />
                </FormField>
                <FormField label="Office Phone">
                  <PhoneInput name="office_telephone" defaultValue={contact?.office_telephone ?? ""} defaultCountryCode="852" placeholder="2XXX XXXX" />
                </FormField>
                <FormField label="Fax">
                  <PhoneInput name="fax" defaultValue={contact?.fax ?? ""} defaultCountryCode="852" placeholder="Optional" />
                </FormField>
                <FormField label="Email">
                  <Input name="email_1" type="email" className={inputStyles} defaultValue={contact?.email_1 ?? ""} placeholder="email@example.com" />
                </FormField>
              </FormSection>

              <FormSection icon={MapPin} title="Address" accentColor="primary">
                <FormField label="Address">
                  <div className="flex gap-2">
                    <Input
                      name="address_1"
                      className={`${inputStyles} flex-1`}
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      placeholder="Street address, flat number, district, city"
                    />
                    {studentAddress && (
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="h-10 w-10 shrink-0"
                        title="Copy from student"
                        onClick={() => setAddress(studentAddress)}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </FormField>
              </FormSection>

              <FormSection icon={MessageSquare} title="Remarks" accentColor="amber">
                <Textarea
                  name="remarks"
                  placeholder="Additional notes about this contact..."
                  rows={3}
                  className="resize-none bg-background border-border focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-200"
                  defaultValue={contact?.remarks ?? ""}
                />
              </FormSection>
            </div>
          </div>

          {/* Footer */}
          <div className="border-t border-border bg-muted/50 px-6 py-4">
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
                      {mode === "create" ? <UserPlus className="h-4 w-4" /> : <Check className="h-4 w-4" />}
                      {mode === "create" ? "Add Contact" : "Save Changes"}
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

/** Edit button trigger for existing contacts */
export function EditContactButton({
  contact,
  studentId,
  referenceData,
  studentAddress,
}: {
  contact: ContactWithRelations
  studentId: string
  referenceData: { relationships: ReferenceItem[]; titles: ReferenceItem[] }
  studentAddress?: string | null
}) {
  return (
    <ContactDialog
      studentId={studentId}
      referenceData={referenceData}
      mode="edit"
      contact={contact}
      studentAddress={studentAddress}
      trigger={
        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors">
          <Pencil className="h-3.5 w-3.5" />
        </Button>
      }
    />
  )
}

/** Delete contact dialog with refined design */
export function DeleteContactButton({
  contactId,
  studentId,
  contactName,
}: {
  contactId: string
  studentId: string
  contactName: string
}) {
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const handleDelete = () => {
    setError(null)
    startTransition(async () => {
      const result = await deleteStudentContact(contactId, studentId)
      if (result.success) {
        setOpen(false)
      } else {
        setError(result.error ?? "Failed to delete contact")
      }
    })
  }

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
        onClick={() => setOpen(true)}
      >
        <Trash2 className="h-3.5 w-3.5" />
      </Button>
      <AlertDialogContent className="sm:max-w-[420px]">
        <AlertDialogHeader>
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-destructive/10">
              <Trash2 className="h-5 w-5 text-destructive" />
            </div>
            <div className="space-y-1.5">
              <AlertDialogTitle className="text-lg">Delete Contact</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete <strong className="text-foreground">{contactName}</strong>?
                This action cannot be undone.
              </AlertDialogDescription>
            </div>
          </div>
        </AlertDialogHeader>
        {error && (
          <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
            {error}
          </div>
        )}
        <AlertDialogFooter className="gap-2 sm:gap-2">
          <AlertDialogCancel disabled={isPending} className="rounded-lg">
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={isPending}
            className="rounded-lg bg-destructive text-destructive-foreground hover:bg-destructive/90 gap-2"
          >
            {isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Deleting...
              </>
            ) : (
              <>
                <Trash2 className="h-4 w-4" />
                Delete
              </>
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
