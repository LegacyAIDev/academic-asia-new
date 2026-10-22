import { memo } from "react"
import { cn } from "@/lib/utils"
import type { PresentSchoolListRow } from "@/lib/supabase/queries/present-schools"
import { PresentSchoolDialog } from "./present-school-dialog"

/** One school: its name with the other spellings beneath, who added it if staff did, and how many students attend it. */
export const PresentSchoolRow = memo(function PresentSchoolRow({ school, canManage }: { school: PresentSchoolListRow; canManage: boolean }) {
  return (
    <li className="flex items-start gap-4 px-4 py-2.5">
      <div className="min-w-0 flex-1">
        <p className="break-words text-sm font-medium">{school.name}</p>
        {school.aliases.length > 0 && (
          <p className="mt-0.5 break-words text-xs text-muted-foreground">Also {school.aliases.join(" · ")}</p>
        )}
        {school.source === "staff" && (
          <p className="mt-0.5 text-xs text-muted-foreground">Added by staff</p>
        )}
      </div>
      <p className={cn("w-14 shrink-0 pt-px text-right text-sm tabular-nums", school.student_count === 0 ? "text-muted-foreground" : "font-medium")}>
        <span className="sr-only">Students: </span>
        {school.student_count.toLocaleString("en-GB")}
      </p>
      {canManage && <div className="-my-1.5 -mr-2"><PresentSchoolDialog mode="edit" school={school} /></div>}
    </li>
  )
})
