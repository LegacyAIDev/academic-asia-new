"use client"

import { useState } from "react"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Eye, GraduationCap, CalendarDays, Award, MapPin, MessageSquare,
  Wallet, ClipboardCheck, CalendarClock, Sparkles,
} from "lucide-react"
import { cn } from "@/lib/utils"
import type { ApplicationWithJoins } from "@/lib/supabase/queries/student-applications"

const monthNames = ["", "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]

/** Status badge colours keyed by the status category. */
const statusCategoryStyles: Record<string, string> = {
  awaiting: "bg-amber-50 text-amber-700 border-amber-200",
  offered: "bg-blue-50 text-blue-700 border-blue-200",
  deposited: "bg-emerald-50 text-emerald-700 border-emerald-200",
  waiting: "bg-orange-50 text-orange-700 border-orange-200",
  positive: "bg-green-50 text-green-700 border-green-200",
  negative: "bg-rose-50 text-rose-700 border-rose-200",
  unavailable: "bg-slate-100 text-slate-600 border-slate-200",
  other: "bg-violet-50 text-violet-700 border-violet-200",
}

function csd(month: number | null, year: number | null) {
  if (!month && !year) return "—"
  return [month ? monthNames[month] : "", year ?? ""].filter(Boolean).join("-")
}

function fmtDate(value: string | null) {
  if (!value) return "—"
  try {
    return new Date(value).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })
  } catch { return value }
}

function fmtTime(value: string | null) {
  if (!value) return "—"
  return value.slice(0, 5)
}

function money(value: number | null) {
  if (value == null) return "—"
  return value.toLocaleString()
}

/** One label/value pair. */
function Field({ label, value, wide }: { label: string; value: React.ReactNode; wide?: boolean }) {
  return (
    <div className={wide ? "sm:col-span-2 space-y-0.5" : "space-y-0.5"}>
      <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</p>
      <div className="text-sm">{value || "—"}</div>
    </div>
  )
}

/** Icon-led group heading — shared by field sections and the sub-record lists. */
function SectionHead({ icon: Icon, title, count }: { icon: React.ElementType; title: string; count?: number }) {
  return (
    <div className="mb-3 flex items-center gap-2">
      <div className="flex h-6 w-6 items-center justify-center rounded-md bg-primary/10">
        <Icon className="h-3.5 w-3.5 text-primary" />
      </div>
      <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{title}</h3>
      {count != null && <Badge variant="secondary" className="h-5 rounded-full px-1.5 text-[10px]">{count}</Badge>}
    </div>
  )
}

/** Titled group wrapping fields in a subtle card. */
function Section({ icon, title, children }: { icon: React.ElementType; title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border bg-muted/20 p-4">
      <SectionHead icon={icon} title={title} />
      <div className="grid gap-4 sm:grid-cols-2">{children}</div>
    </section>
  )
}

/** Read-only view of a single school application — all fields and sub-records. */
export function ViewApplicationButton({ application: app }: { application: ApplicationWithJoins }) {
  const [open, setOpen] = useState(false)

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon"
          className="h-8 w-8 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
          title="View details">
          <Eye className="h-3.5 w-3.5" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:!max-w-[760px] w-[95vw] !max-h-[92vh] overflow-hidden !p-0 !gap-0 flex flex-col">
        <DialogHeader className="gap-0 border-b bg-gradient-to-r from-primary/5 via-transparent to-transparent p-5">
          <div className="flex items-start gap-3 pr-8">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 shadow-sm">
              <GraduationCap className="h-5.5 w-5.5 text-primary" />
            </div>
            <div className="min-w-0 flex-1">
              <DialogTitle className="truncate text-base leading-tight">
                {app.school?.name ?? "School Application"}
              </DialogTitle>
              <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                <span className="flex items-center gap-1"><CalendarDays className="h-3 w-3" /> Apply {csd(app.entry_month, app.entry_year)}</span>
                <span className="flex items-center gap-1"><CalendarClock className="h-3 w-3" /> C.S.D. {csd(app.course_start_month, app.course_start_year)}</span>
              </p>
              <div className="mt-2 flex flex-wrap items-center gap-1.5">
                {app.status && (
                  <Badge variant="outline" className={cn("border text-xs font-medium", statusCategoryStyles[app.status.category ?? "other"])}>
                    {app.status.label}
                  </Badge>
                )}
                {app.mode?.code === "suspended" && (
                  <Badge variant="outline" className="border-rose-200 bg-rose-50 text-xs text-rose-700">Suspended</Badge>
                )}
                {app.is_referral && (
                  <Badge variant="outline" className="text-xs">Referral</Badge>
                )}
                {app.is_archived && <Badge variant="secondary" className="text-xs">Archived</Badge>}
              </div>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 space-y-4 overflow-y-auto p-5">
          <Section icon={GraduationCap} title="School & Status">
            <Field label="School" value={app.school?.name} />
            <Field label="Enrol Status" value={app.status?.label} />
            <Field label="Mode" value={app.mode?.code === "suspended" ? "Suspended" : "Normal"} />
            <Field label="Year Group" value={app.year_group?.toString()} />
            <Field label="Enrol Status Remarks" value={app.result_remarks} wide />
          </Section>

          <Section icon={CalendarClock} title="Course & Entry">
            <Field label="Year Apply" value={csd(app.entry_month, app.entry_year)} />
            <Field label="Course Start Date (C.S.D.)" value={csd(app.course_start_month, app.course_start_year)} />
            <Field label="Registration Date" value={fmtDate(app.registration_date)} />
          </Section>

          <Section icon={Award} title="Referral & Scholarship">
            <Field label="Referral" value={app.is_referral ? "Yes" : "No"} />
            <Field label="Scholarship Types" value={
              app.scholarship_types?.length ? <span className="capitalize">{app.scholarship_types.join(", ")}</span> : null
            } />
            <Field label="Scholarship Detail" value={app.scholarship_detail} wide />
          </Section>

          <Section icon={Sparkles} title="Event & Audition">
            <Field label="Event" value={app.event?.name} />
            <Field label="Event Date" value={fmtDate(app.event_date)} />
            <Field label="Event Time" value={fmtTime(app.event_time)} />
            <Field label="Music Audition" value={app.music_audition} wide />
          </Section>

          <Section icon={MapPin} title="School Visit">
            <Field label="Visit Date" value={fmtDate(app.visit_date)} />
            <Field label="Visit Time" value={fmtTime(app.visit_time)} />
            <Field label="School Contact" value={app.school_contact} />
            <Field label="Visit Remarks" value={app.visit_remarks} wide />
          </Section>

          <Section icon={MessageSquare} title="Remarks">
            <Field label="AA Remarks" value={app.aa_remarks} wide />
            <Field label="Remarks to School" value={app.remarks_to_school} wide />
          </Section>

          {/* Deposits */}
          <section className="rounded-xl border bg-muted/20 p-4">
            <SectionHead icon={Wallet} title="Deposits" count={app.deposits.length} />
            {app.deposits.length === 0 ? (
              <p className="text-sm text-muted-foreground">None</p>
            ) : (
              <div className="space-y-2">
                {app.deposits.map((d) => (
                  <div key={d.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded-lg border bg-background p-3 text-sm">
                    <span className="font-medium">{fmtDate(d.deposit_date)}</span>
                    <span>Amount: {money(d.amount)}</span>
                    <span>Discount: {money(d.discount)}</span>
                    {d.has_commission && <Badge variant="outline" className="text-xs">Commission</Badge>}
                    {d.remarks && <span className="text-muted-foreground">· {d.remarks}</span>}
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Entrance exams */}
          <section className="rounded-xl border bg-muted/20 p-4">
            <SectionHead icon={ClipboardCheck} title="Entrance Exams" count={app.exams.length} />
            {app.exams.length === 0 ? (
              <p className="text-sm text-muted-foreground">None</p>
            ) : (
              <div className="space-y-2">
                {app.exams.map((ex) => (
                  <div key={ex.id} className="rounded-lg border bg-background p-3 text-sm">
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                      <span className="font-medium">{ex.subject ?? "Exam"}</span>
                      {ex.apply_year && <span className="text-muted-foreground">Apply: {ex.apply_year}</span>}
                      {ex.score != null && <span>Score: {ex.score}</span>}
                      {ex.room && <span>Room: {ex.room}</span>}
                      {ex.seat_no != null && <span>Seat: {ex.seat_no}</span>}
                    </div>
                    <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                      <span>Preferred: {fmtDate(ex.preferred_date)} {fmtTime(ex.preferred_start_time)}</span>
                      <span>Confirmed: {fmtDate(ex.confirmed_date)} {fmtTime(ex.confirmed_start_time)}</span>
                      {ex.remarks && <span>· {ex.remarks}</span>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </DialogContent>
    </Dialog>
  )
}
