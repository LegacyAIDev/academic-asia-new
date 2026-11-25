"use client"

import { useState, useTransition } from "react"
import { ChevronDown, Loader2, MessageSquarePlus, Plus, UserPlus } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { PhoneInput } from "@/components/ui/phone-input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Textarea } from "@/components/ui/textarea"
import { useRouterWithProgress } from "@/components/layout/navigation-progress"
import { createEnquiry, type EnquiryInput } from "@/lib/supabase/actions/student-enquiries"
import { useAddParam } from "@/lib/students/use-add-param"
import { AddStudentSheet } from "./[id]/edit-student-sheet"

/** This year and the next five. */
const ENTRY_YEARS = Array.from({ length: 6 }, (_, i) => new Date().getFullYear() + i)

function Field({ id, label, required, wide, children }: { id: string; label: string; required?: boolean; wide?: boolean; children: React.ReactNode }) {
  return (
    <div className={`min-w-0 space-y-2 ${wide ? "sm:col-span-2" : ""}`}>
      <Label htmlFor={id}>{label}{required && <span className="text-destructive"> *</span>}</Label>
      {children}
    </div>
  )
}

/** The short form for a first enquiry: who, who got in touch, how to reach them. */
function EnquirySheet({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const router = useRouterWithProgress()
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [relationship, setRelationship] = useState("")
  const [entryYear, setEntryYear] = useState("")
  const [leadSource, setLeadSource] = useState("")

  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const text = (name: string) => (form.get(name) as string | null) ?? ""
    const input: EnquiryInput = {
      first_name: text("first_name"),
      surname: text("surname"),
      parent_name: text("parent_name"),
      parent_relationship: (relationship || null) as EnquiryInput["parent_relationship"],
      phone: text("phone"),
      email: text("email"),
      entry_year: entryYear ? Number(entryYear) : null,
      lead_source_category: (leadSource || null) as EnquiryInput["lead_source_category"],
      lead_source_referral_detail: text("lead_source_referral_detail"),
      remarks: text("remarks"),
    }
    setError(null)
    startTransition(async () => {
      const result = await createEnquiry(input)
      if (!result.success || !result.data) {
        setError(result.error ?? "Could not save the enquiry")
        return
      }
      if (result.error) toast.warning(result.error)
      else toast.success("Enquiry added")
      onOpenChange(false)
      router.push(`/students/${result.data.id}`)
    })
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full gap-0 overflow-y-auto p-0 sm:max-w-lg">
        <SheetHeader className="sticky top-0 z-20 border-b bg-background px-6 py-4">
          <SheetTitle>Add an enquiry</SheetTitle>
          <SheetDescription>The basics for now; complete the full profile when the family goes ahead.</SheetDescription>
        </SheetHeader>
        <form onSubmit={submit} className="space-y-5 px-6 py-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field id="enquiry-first-name" label="Student first name" required>
              <Input id="enquiry-first-name" name="first_name" required autoFocus />
            </Field>
            <Field id="enquiry-surname" label="Student surname" required>
              <Input id="enquiry-surname" name="surname" required />
            </Field>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field id="enquiry-parent-name" label="Parent or guardian">
              <Input id="enquiry-parent-name" name="parent_name" placeholder="Name" />
            </Field>
            <Field id="enquiry-relationship" label="Relationship">
              <Select value={relationship} onValueChange={setRelationship}>
                <SelectTrigger id="enquiry-relationship" className="w-full"><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="mother">Mother</SelectItem>
                  <SelectItem value="father">Father</SelectItem>
                  <SelectItem value="guardian">Guardian</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field id="enquiry-phone" label="Phone" wide>
              <PhoneInput name="phone" defaultCountryCode="852" placeholder="e.g. 9123 4567" />
            </Field>
            <Field id="enquiry-email" label="Email" wide>
              <Input id="enquiry-email" name="email" type="email" />
            </Field>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field id="enquiry-entry-year" label="Entry year">
              <Select value={entryYear} onValueChange={setEntryYear}>
                <SelectTrigger id="enquiry-entry-year" className="w-full"><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>{ENTRY_YEARS.map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}</SelectContent>
              </Select>
            </Field>
            <Field id="enquiry-lead-source" label="How they found us">
              <Select value={leadSource} onValueChange={setLeadSource}>
                <SelectTrigger id="enquiry-lead-source" className="w-full"><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="walk_in">Walk-in</SelectItem>
                  <SelectItem value="referral">Referral</SelectItem>
                  <SelectItem value="events">Event</SelectItem>
                  <SelectItem value="direct">Direct</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            {leadSource === "referral" && (
              <Field id="enquiry-referral" label="Referred by">
                <Input id="enquiry-referral" name="lead_source_referral_detail" placeholder="Who referred them?" />
              </Field>
            )}
          </div>

          <Field id="enquiry-remarks" label="Note">
            <Textarea id="enquiry-remarks" name="remarks" rows={3} placeholder="What they asked about" />
          </Field>

          {error && <p role="alert" className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">{error}</p>}

          <div className="flex justify-end gap-2 border-t pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={pending}>Cancel</Button>
            <Button type="submit" disabled={pending} className="gap-2">
              {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              Add enquiry
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  )
}

/**
 * "Add student" offering a quick enquiry or the full new-student form.
 * `?add=enquiry` opens the enquiry form; `?add=student` the full one.
 */
export function AddStudentMenu() {
  const [enquiryOpen, setEnquiryOpen] = useAddParam("enquiry")
  const [studentOpen, setStudentOpen] = useState(false)
  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button className="gap-2">
            <Plus className="h-4 w-4" /> Add student <ChevronDown className="h-4 w-4 opacity-70" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-64">
          <DropdownMenuItem onSelect={() => setEnquiryOpen(true)} className="items-start gap-3 py-2">
            <MessageSquarePlus className="mt-0.5 h-4 w-4" />
            <span><span className="block font-medium">Add enquiry</span><span className="block text-xs text-muted-foreground">Basic details for a quick entry</span></span>
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => setStudentOpen(true)} className="items-start gap-3 py-2">
            <UserPlus className="mt-0.5 h-4 w-4" />
            <span><span className="block font-medium">Add new student</span><span className="block text-xs text-muted-foreground">The full student form</span></span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <EnquirySheet open={enquiryOpen} onOpenChange={setEnquiryOpen} />
      <AddStudentSheet hideButton open={studentOpen} onOpenChange={setStudentOpen} />
    </>
  )
}
