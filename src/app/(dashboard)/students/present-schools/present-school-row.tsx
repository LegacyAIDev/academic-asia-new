import { Badge } from "@/components/ui/badge"
import type { PresentSchoolListRow } from "@/lib/supabase/queries/present-schools"
import { PresentSchoolDialog } from "./present-school-dialog"

/** One school: its name with the other spellings beneath, how many students attend it, and who added it. */
export function PresentSchoolRow({ school, canManage }: { school: PresentSchoolListRow; canManage: boolean }) {
  return (
    <li className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-3">
      <div className="min-w-0 flex-1 basis-[240px]">
        <p className="text-sm font-medium">{school.name}</p>
        {school.aliases.length > 0 && (
          <p className="mt-0.5 text-xs text-muted-foreground">Also {school.aliases.join(" · ")}</p>
        )}
      </div>

      <div className="ml-auto flex items-center gap-3">
        {school.source === "staff" && (
          <Badge variant="outline" className="text-[11px] text-muted-foreground">Added by staff</Badge>
        )}
        <span className="w-24 text-right text-xs text-muted-foreground tabular-nums">
          {school.student_count.toLocaleString("en-GB")} {school.student_count === 1 ? "student" : "students"}
        </span>
        {canManage && <PresentSchoolDialog mode="edit" school={school} />}
      </div>
    </li>
  )
}
