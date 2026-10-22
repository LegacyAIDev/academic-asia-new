import Link from "next/link"
import { ArrowRight } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { linkedStudentDetails, linkedStudentName } from "@/lib/students/linked-student-label"
import type { LinkedStudent } from "@/lib/supabase/queries/student-family"

type LinkedStudentCardProps = {
  student: LinkedStudent
  /** The relationship as this student sees it ("Brother", "Sister", "Cousin"). */
  label: string
  /** Edit and remove, when the link belongs to this student and the viewer may edit. */
  actions?: React.ReactNode
  /** Set when the link was made on the other student's profile, where it is edited. */
  linkedFromOtherProfile?: boolean
  /** Mobile or email staff recorded on this family row, if any. */
  contactLine?: string
}

/** A family member who is a student too: who they are and a way straight to their profile. */
export function LinkedStudentCard({ student, label, actions, linkedFromOtherProfile, contactLine }: LinkedStudentCardProps) {
  const initials = `${student.first_name?.[0] ?? ""}${student.surname?.[0] ?? ""}`.toUpperCase() || "?"

  return (
    <Card className="border shadow-none">
      <CardContent className="pt-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex min-w-0 items-center gap-3">
            <Avatar className="h-10 w-10">
              <AvatarFallback className="bg-primary/10 text-primary text-sm">{initials}</AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{linkedStudentName(student)}</p>
              <Badge variant="secondary" className="mt-1 text-xs">{label}</Badge>
            </div>
          </div>
          {actions && <div className="flex items-center gap-1">{actions}</div>}
        </div>

        <p className="mt-3 truncate text-xs text-muted-foreground tabular-nums">{linkedStudentDetails(student)}</p>
        {contactLine && <p className="mt-1 truncate text-xs text-muted-foreground">{contactLine}</p>}

        <div className="mt-3 flex items-center justify-between gap-2">
          <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            {linkedFromOtherProfile ? "Linked from their profile" : "Student"}
          </span>
          <Link
            href={`/students/${student.id}?tab=family`}
            className="inline-flex h-9 items-center gap-1 rounded-md px-2 text-sm font-medium text-primary hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            View profile <ArrowRight className="h-3.5 w-3.5" aria-hidden />
          </Link>
        </div>
      </CardContent>
    </Card>
  )
}
