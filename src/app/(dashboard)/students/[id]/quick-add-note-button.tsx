"use client"

import { MessageSquare } from "lucide-react"
import { Button } from "@/components/ui/button"
import { focusNoteComposer, requestNoteComposer } from "@/components/features/record-notes"

const ANCHOR = "student-notes"

/**
 * Quick Actions > Add Note (UAT DEV24-011): starts a note in the Notes section
 * on Overview, switching to that tab first (through its own tab link, so the
 * tabs follow) when another one is open.
 */
export function QuickAddNoteButton({ studentId, onOverview }: { studentId: string; onOverview: boolean }) {
  const start = () => {
    if (onOverview) return focusNoteComposer(ANCHOR)
    requestNoteComposer(studentId, ANCHOR)
    const tab = document.querySelector<HTMLElement>('[role="tab"][href$="tab=overview"]')
    // The tabs switch on mouse down; the click then follows the tab's link.
    tab?.dispatchEvent(new MouseEvent("mousedown", { bubbles: true, cancelable: true, button: 0 }))
    tab?.click()
  }
  return (
    <Button variant="outline" className="w-full justify-start gap-2" onClick={start}>
      <MessageSquare className="h-4 w-4" />
      Add Note
    </Button>
  )
}

export const STUDENT_NOTES_ANCHOR = ANCHOR
