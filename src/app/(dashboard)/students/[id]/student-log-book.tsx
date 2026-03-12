"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { BookMarked } from "lucide-react"
import { LogBookDialog, DeleteLogBookButton } from "./log-book-dialog"
import type { LogBookWithJoins } from "@/lib/supabase/queries/student-log-book"

type StudentLogBookSectionProps = {
  studentId: string
  logEntries: LogBookWithJoins[]
}

function formatDate(dateStr: string | null) {
  if (!dateStr) return "—"
  try {
    return new Date(dateStr).toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
    })
  } catch {
    return dateStr
  }
}

export function StudentLogBookSection({
  studentId,
  logEntries,
}: StudentLogBookSectionProps) {
  if (logEntries.length === 0) {
    return (
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-medium flex items-center gap-2">
              <BookMarked className="h-4 w-4 text-muted-foreground" />
              Log Book
            </CardTitle>
            <LogBookDialog studentId={studentId} />
          </div>
        </CardHeader>
        <CardContent className="py-8">
          <div className="text-center">
            <BookMarked className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
            <h3 className="text-sm font-medium text-foreground mb-1">No log entries yet</h3>
            <p className="text-sm text-muted-foreground">
              Start tracking student activities and notes
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <CardTitle className="text-base font-medium flex items-center gap-2">
            <BookMarked className="h-4 w-4 text-muted-foreground" />
            Log Book ({logEntries.length})
          </CardTitle>
          <LogBookDialog studentId={studentId} />
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {logEntries.map((entry) => (
            <div key={entry.id} className="relative pl-6 border-l-2 border-border">
              <div className="absolute -left-[5px] top-1.5 h-2 w-2 rounded-full bg-primary" />
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                    <span>{formatDate(entry.created_at)}</span>
                    {entry.assigned_profile?.full_name && (
                      <>
                        <span>·</span>
                        <span className="font-medium text-foreground">
                          {entry.assigned_profile.full_name}
                        </span>
                      </>
                    )}
                  </div>
                  <p className="text-sm whitespace-pre-wrap">{entry.remarks || "—"}</p>
                </div>
                <DeleteLogBookButton
                  entryId={entry.id}
                  studentId={studentId}
                />
              </div>
            </div>
          ))}
        </div>
        <div className="pt-4 border-t mt-4 text-xs text-muted-foreground">
          Total: {logEntries.length} entr{logEntries.length !== 1 ? "ies" : "y"}
        </div>
      </CardContent>
    </Card>
  )
}
