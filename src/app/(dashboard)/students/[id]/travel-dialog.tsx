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
  Plane,
  MapPin,
  ClipboardList,
  MessageSquare,
  Truck,
  Check,
  Paperclip,
} from "lucide-react"
import {
  createStudentTravel,
  updateStudentTravel,
  deleteStudentTravel,
  type CreateTravelInput,
} from "@/lib/supabase/actions/student-travel"
import type { TravelWithJoins } from "@/lib/supabase/queries/student-travel"
import { AttachmentField, type AttachmentFieldHandle } from "@/components/features/attachment-field"
import type { AttachmentRecord } from "@/lib/supabase/queries/record-attachments"

type AirlineItem = { id: number; code: string; label: string }
type AirportItem = { id: number; code: string; label: string; city: string | null }
type StatusItem = { id: number; code: string; label: string }
type PickupStatusItem = { id: number; code: string; label: string }
type PickupProviderItem = { id: number; code: string; label: string }

export type TravelReferenceData = {
  airlines: AirlineItem[]
  airports: AirportItem[]
  statuses: StatusItem[]
  pickupStatuses: PickupStatusItem[]
  pickupProviders: PickupProviderItem[]
}

type TravelDialogProps = {
  studentId: string
  referenceData: TravelReferenceData
  mode: "create" | "edit"
  travel?: TravelWithJoins
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

export function TravelDialog({
  studentId,
  referenceData,
  mode,
  travel,
  trigger,
  attachments = [],
  canWrite = true,
}: TravelDialogProps) {
  const [open, setOpen] = useState(false)
  const attachRef = useRef<AttachmentFieldHandle>(null)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const { airlines, airports, statuses, pickupStatuses, pickupProviders } = referenceData

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)

    const formData = new FormData(e.currentTarget)

    const input: Omit<CreateTravelInput, 'student_id'> = {
      requires_pickup: formData.get("requires_pickup") === "true",
      journey_no: formData.get("journey_no") ? parseInt(formData.get("journey_no") as string, 10) : null,
      route: formData.get("route") ? parseInt(formData.get("route") as string, 10) : null,
      status_id: formData.get("status_id") ? parseInt(formData.get("status_id") as string, 10) : null,
      airline_id: formData.get("airline_id") ? parseInt(formData.get("airline_id") as string, 10) : null,
      flight_number: (formData.get("flight_number") as string) || null,
      airport_id: formData.get("airport_id") ? parseInt(formData.get("airport_id") as string, 10) : null,
      arrival_date: (formData.get("arrival_date") as string) || null,
      arrival_time: (formData.get("arrival_time") as string) || null,
      remarks: (formData.get("remarks") as string) || null,
      pickup_status_id: formData.get("pickup_status_id") ? parseInt(formData.get("pickup_status_id") as string, 10) : null,
      pickup_provider_id: formData.get("pickup_provider_id") ? parseInt(formData.get("pickup_provider_id") as string, 10) : null,
      pickup_by: (formData.get("pickup_by") as string) || null,
      meeting_point_details: (formData.get("meeting_point_details") as string) || null,
      fee: formData.get("fee") ? parseFloat(formData.get("fee") as string) : null,
    }

    startTransition(async () => {
      let result
      if (mode === "create") {
        result = await createStudentTravel({ ...input, student_id: studentId } as CreateTravelInput)
        // Staged attachments could not be linked before the row existed.
        if (result?.success && result.data?.id) {
          const failed = await attachRef.current?.flush(result.data.id) ?? 0
          if (failed > 0) setError(`Saved, but ${failed} attachment(s) failed to upload`)
        }
      } else if (travel?.id) {
        result = await updateStudentTravel(travel.id, studentId, input)
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
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button size="sm" className="gap-2 shadow-sm bg-primary hover:bg-primary/90 transition-all duration-200">
            <Plus className="h-4 w-4" />
            New Travel
          </Button>
        )}
      </DialogTrigger>
      <DialogContent
        className="sm:!max-w-[960px] !max-h-[92vh] !overflow-hidden !p-0 !gap-0 bg-background flex flex-col"
        showCloseButton={false}
      >
        {/* Header */}
        <div className="relative overflow-hidden border-b border-border/50">
          <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-primary/5" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-primary/10 via-transparent to-transparent opacity-60" />

          <div className="relative flex items-center gap-4 px-6 py-5">
            <div className="relative">
              <div className="absolute inset-0 bg-primary/20 rounded-2xl blur-xl" />
              <div className="relative flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-primary/80 text-primary-foreground shadow-lg shadow-primary/25">
                <Plane className="h-5 w-5" />
              </div>
            </div>

            <DialogHeader className="flex-1 space-y-1">
              <DialogTitle className="text-xl font-semibold tracking-tight">
                {mode === "create" ? "New Travel Record" : "Edit Travel Record"}
              </DialogTitle>
              <p className="text-sm text-muted-foreground">
                {mode === "create"
                  ? "Add flight details and pickup arrangements"
                  : "Update travel record details"}
              </p>
            </DialogHeader>

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

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex flex-col min-h-0 flex-1">
          <div className="flex-1 overflow-y-auto px-6 py-5">
            {error && (
              <div className="flex items-center gap-3 rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive animate-in slide-in-from-top-2 duration-300 mb-5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-destructive/10">
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <span className="font-medium">{error}</span>
              </div>
            )}

            <div className="grid lg:grid-cols-2 gap-5">
              {/* Left Column */}
              <div className="space-y-5">
                <FormSection icon={ClipboardList} title="Journey Info" accentColor="primary">
                  <div className="grid grid-cols-2 gap-3">
                    <FormField label="Pickup Required">
                      <Select name="requires_pickup" defaultValue={travel?.requires_pickup ? "true" : "false"}>
                        <SelectTrigger className={selectTriggerStyles}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="false">No</SelectItem>
                          <SelectItem value="true">Yes</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormField>
                    <FormField label="Status">
                      <Select name="status_id" defaultValue={travel?.status_id?.toString() ?? "1"}>
                        <SelectTrigger className={selectTriggerStyles}>
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                        <SelectContent>
                          {statuses.map((s) => (
                            <SelectItem key={s.id} value={s.id.toString()}>{s.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormField>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <FormField label="Journey No">
                      <Input name="journey_no" type="number" className={inputStyles} defaultValue={travel?.journey_no ?? ""} placeholder="0" />
                    </FormField>
                    <FormField label="Route">
                      <Input name="route" type="number" className={inputStyles} defaultValue={travel?.route ?? "1"} placeholder="1" />
                    </FormField>
                  </div>
                </FormSection>

                <FormSection icon={Plane} title="Flight Detail" accentColor="teal">
                  <FormField label="Airline">
                    <Select name="airline_id" defaultValue={travel?.airline_id?.toString() ?? ""}>
                      <SelectTrigger className={selectTriggerStyles}>
                        <SelectValue placeholder="Select airline" />
                      </SelectTrigger>
                      <SelectContent className="max-h-60">
                        {airlines.map((a) => (
                          <SelectItem key={a.id} value={a.id.toString()}>{a.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormField>
                  <FormField label="Flight / Train No">
                    <Input name="flight_number" className={inputStyles} defaultValue={travel?.flight_number ?? ""} placeholder="e.g. CX255" />
                  </FormField>
                  <FormField label="Arrival Location">
                    <Select name="airport_id" defaultValue={travel?.airport_id?.toString() ?? ""}>
                      <SelectTrigger className={selectTriggerStyles}>
                        <SelectValue placeholder="Select airport" />
                      </SelectTrigger>
                      <SelectContent className="max-h-60">
                        {airports.map((a) => (
                          <SelectItem key={a.id} value={a.id.toString()}>{a.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormField>
                  <div className="grid grid-cols-2 gap-3">
                    <FormField label="Arrival Date">
                      <Input name="arrival_date" type="date" className={inputStyles} defaultValue={travel?.arrival_date ?? ""} />
                    </FormField>
                    <FormField label="Arrival Time">
                      <Input name="arrival_time" className={inputStyles} defaultValue={travel?.arrival_time ?? ""} placeholder="e.g. 19:05" />
                    </FormField>
                  </div>
                </FormSection>

                <FormSection icon={MessageSquare} title="Remarks" accentColor="amber">
                  <FormField label="Remarks">
                    <Textarea
                      name="remarks"
                      rows={4}
                      className="resize-none bg-background border-border focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-200"
                      defaultValue={travel?.remarks ?? ""}
                      placeholder="Notes about this travel record..."
                    />
                  </FormField>
                </FormSection>
              </div>

              {/* Right Column */}
              <div className="space-y-5">
                  <FormSection icon={Paperclip} title="Attachments" accentColor="rose">
                    <FormField label="Travel documents (file or link)">
                      <AttachmentField
                        ref={attachRef}
                        attachPoint="student_travel"
                        ownerId={studentId}
                        attachableId={mode === "edit" ? travel?.id ?? null : null}
                        attachments={attachments}
                        canWrite={canWrite}
                      />
                    </FormField>
                  </FormSection>

                <FormSection icon={Truck} title="Pickup Confirmation" accentColor="primary">
                  <FormField label="Pickup Status">
                    <Select name="pickup_status_id" defaultValue={travel?.pickup_status_id?.toString() ?? ""}>
                      <SelectTrigger className={selectTriggerStyles}>
                        <SelectValue placeholder="Select pickup status" />
                      </SelectTrigger>
                      <SelectContent className="max-h-60">
                        {pickupStatuses.map((ps) => (
                          <SelectItem key={ps.id} value={ps.id.toString()}>{ps.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormField>
                  <FormField label="Pickup By (Provider)">
                    <Select name="pickup_provider_id" defaultValue={travel?.pickup_provider_id?.toString() ?? ""}>
                      <SelectTrigger className={selectTriggerStyles}>
                        <SelectValue placeholder="Select provider" />
                      </SelectTrigger>
                      <SelectContent>
                        {pickupProviders.map((pp) => (
                          <SelectItem key={pp.id} value={pp.id.toString()}>{pp.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormField>
                  <FormField label="Pickup By (Detail)">
                    <Input name="pickup_by" className={inputStyles} defaultValue={travel?.pickup_by ?? ""} placeholder='e.g. "Etherton Education"' />
                  </FormField>
                  <FormField label="Meeting Point / Pickup Person / Contact No">
                    <Textarea
                      name="meeting_point_details"
                      rows={4}
                      className="resize-none bg-background border-border focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-200"
                      defaultValue={travel?.meeting_point_details ?? ""}
                      placeholder="Meeting point, contact person, phone..."
                    />
                  </FormField>
                  <FormField label="Fee">
                    <Input name="fee" type="number" step="0.01" className={inputStyles} defaultValue={travel?.fee ?? ""} placeholder="0.00" />
                  </FormField>
                </FormSection>

                <FormSection icon={MapPin} title="Location Note" accentColor="teal">
                  <p className="text-xs text-muted-foreground">
                    Airport list shows UK airports and major international hubs. If the arrival location is not listed, add details in the Remarks field.
                  </p>
                </FormSection>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="border-t border-border bg-muted/50 px-6 py-4">
            <div className="flex items-center justify-end gap-3">
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
                    {mode === "create" ? "Create Record" : "Save Changes"}
                  </>
                )}
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

/** Edit button for existing travel records */
export function EditTravelButton({
  travel,
  studentId,
  referenceData,
  attachments = [],
  canWrite = true,
}: {
  travel: TravelWithJoins
  studentId: string
  referenceData: TravelReferenceData
  attachments?: AttachmentRecord[]
  canWrite?: boolean
}) {
  return (
    <TravelDialog
      studentId={studentId}
      referenceData={referenceData}
      mode="edit"
      travel={travel}
      attachments={attachments}
      canWrite={canWrite}
      trigger={
        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors">
          <Pencil className="h-3.5 w-3.5" />
        </Button>
      }
    />
  )
}

/** Delete travel record dialog */
export function DeleteTravelButton({
  travelId,
  studentId,
  label,
}: {
  travelId: string
  studentId: string
  label: string
}) {
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const handleDelete = () => {
    setError(null)
    startTransition(async () => {
      const result = await deleteStudentTravel(travelId, studentId)
      if (result.success) {
        setOpen(false)
      } else {
        setError(result.error ?? "Failed to delete travel record")
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
              <AlertDialogTitle className="text-lg">Delete Travel Record</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete the travel record <strong className="text-foreground">{label}</strong>?
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
          <AlertDialogCancel disabled={isPending} className="rounded-lg">Cancel</AlertDialogCancel>
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
