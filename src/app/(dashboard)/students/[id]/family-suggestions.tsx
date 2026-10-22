"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Link2, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { createStudentContact } from "@/lib/supabase/actions/students"
import { siblingCodeFor } from "@/lib/students/family-relationships"
import { linkedStudentDetails, linkedStudentName, sharedDetailsText } from "@/lib/students/linked-student-label"
import type { FamilySuggestion } from "@/lib/supabase/queries/student-family"

type FamilySuggestionsProps = {
  studentId: string
  suggestions: FamilySuggestion[]
  relationships: { id: number; code: string; label: string }[]
}

/**
 * "Possibly family in the system": students whose family shares a mobile number
 * or email with this student's. A shared number is only a hint, so each one is
 * linked by hand, as a brother or sister by that student's gender (editable
 * afterwards). "Not family" hides a suggestion until the page is opened again.
 */
export function FamilySuggestions({ studentId, suggestions, relationships }: FamilySuggestionsProps) {
  const router = useRouter()
  const [dismissed, setDismissed] = useState<Set<string>>(() => new Set())
  const [linking, setLinking] = useState<string | null>(null)

  const shown = suggestions.filter((s) => !dismissed.has(s.id))
  if (shown.length === 0) return null

  const dismiss = (id: string) => setDismissed((current) => new Set(current).add(id))

  async function link(suggestion: FamilySuggestion, relationship: string) {
    const code = siblingCodeFor(suggestion.gender)
    const relationshipId = code ? relationships.find((r) => r.code === code)?.id : null
    if (relationshipId === undefined) {
      toast.error(`The relationship "${code}" is missing from the list. Ask an administrator to add it.`)
      return
    }
    setLinking(suggestion.id)
    try {
      const result = await createStudentContact({ student_id: studentId, relationship_id: relationshipId, related_student_id: suggestion.id })
      if (!result.success) {
        toast.error(result.error ?? "Could not link the student")
        return
      }
      toast.success(`${linkedStudentName(suggestion)} linked as ${relationship}`)
      // Gone at once, so it cannot be linked twice while the page reloads with the new family member.
      dismiss(suggestion.id)
      router.refresh()
    } catch {
      toast.error("Could not link. Check the connection and try again.")
    } finally {
      setLinking(null)
    }
  }

  return (
    <section className="space-y-2 rounded-lg border border-dashed border-border p-4">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        Possibly family in the system <span className="tabular-nums">· {shown.length}</span>
      </p>
      <p className="text-xs text-muted-foreground">
        Students whose family shares a mobile number or email with this student&apos;s. Link them if they are brothers or sisters.
      </p>
      <ul className="divide-y divide-border">
        {shown.map((suggestion) => {
          const code = siblingCodeFor(suggestion.gender)
          const relationship = code ?? "family member"
          return (
            <li key={suggestion.id} className="flex flex-wrap items-center gap-3 py-2">
              <div className="min-w-0 flex-1 basis-[220px]">
                <Link
                  href={`/students/${suggestion.id}?tab=family`}
                  className="flex min-h-9 items-center truncate text-sm font-medium hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {linkedStudentName(suggestion)}
                </Link>
                <p className="truncate text-xs text-muted-foreground tabular-nums">{linkedStudentDetails(suggestion)}</p>
                {suggestion.matched_on && (
                  <p className="truncate text-xs text-muted-foreground">{sharedDetailsText(suggestion.matched_on)}</p>
                )}
              </div>
              <div className="flex items-center gap-1">
                <Button type="button" variant="outline" size="sm" className="h-9 gap-1.5"
                  aria-label={`Link ${linkedStudentName(suggestion)} as ${relationship}`}
                  disabled={linking !== null} onClick={() => link(suggestion, relationship)}>
                  {linking === suggestion.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Link2 className="h-3.5 w-3.5" />}
                  Link as {relationship}
                </Button>
                <Button type="button" variant="ghost" size="sm" className="h-9" disabled={linking === suggestion.id}
                  aria-label={`Not family: ${linkedStudentName(suggestion)}`}
                  onClick={() => dismiss(suggestion.id)}>
                  Not family
                </Button>
              </div>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
