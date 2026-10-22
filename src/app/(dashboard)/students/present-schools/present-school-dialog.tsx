"use client"

import { useId, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Loader2, Pencil, Plus } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog"
import { createPresentSchool, updatePresentSchool } from "@/lib/supabase/actions/present-schools"
import { PRESENT_SCHOOL_NAME_MAX, cleanSchoolName, presentSchoolKey } from "@/lib/students/present-school-name"
import type { PresentSchoolListRow } from "@/lib/supabase/queries/present-schools"

type PresentSchoolDialogProps = {
  mode: "create" | "edit"
  school?: PresentSchoolListRow
  /** Starts a new school from what was typed in the search. */
  defaultName?: string
  trigger?: React.ReactNode
}

/** Add or edit one school on the list: its name and other spellings, one per line. */
export function PresentSchoolDialog({ mode, school, defaultName = "", trigger }: PresentSchoolDialogProps) {
  const router = useRouter()
  const fieldId = useId()
  const [open, setOpen] = useState(false)
  const [name, setName] = useState("")
  const [spellings, setSpellings] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const renamed = !!school && presentSchoolKey(name) !== "" && cleanSchoolName(name) !== school.name

  function openChange(next: boolean) {
    // Stay open until a save finishes, so its result is not lost.
    if (!next && isPending) return
    if (next) {
      setName(school?.name ?? cleanSchoolName(defaultName))
      setSpellings(school?.aliases.join("\n") ?? "")
      setError(null)
    }
    setOpen(next)
  }

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    const input = { name, aliases: spellings.split("\n") }

    startTransition(async () => {
      try {
        const result = school
          ? await updatePresentSchool(school.id, input)
          : await createPresentSchool(input)
        if (!result.success) {
          setError(result.error ?? "Something went wrong")
          return
        }
        toast.success(school ? "School updated" : "School added")
        setOpen(false)
        router.refresh()
      } catch {
        setError("Could not save. Check the connection and try again.")
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={openChange}>
      <DialogTrigger asChild>
        {trigger ?? (mode === "create" ? (
          <Button size="sm" className="h-9 gap-2"><Plus className="h-4 w-4" /> Add school</Button>
        ) : (
          <Button variant="ghost" size="icon" className="h-9 w-9 text-muted-foreground hover:text-primary" title="Edit school" aria-label={`Edit ${school?.name}`}>
            <Pencil className="h-3.5 w-3.5" />
          </Button>
        ))}
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{mode === "create" ? "Add school" : "Edit school"}</DialogTitle>
          <DialogDescription>Names are saved in capitals, the way the list writes them.</DialogDescription>
        </DialogHeader>

        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor={`${fieldId}-name`}>Name</Label>
            <Input
              id={`${fieldId}-name`}
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={PRESENT_SCHOOL_NAME_MAX}
              required
              autoFocus
            />
            {renamed && school.student_count > 0 && (
              <p className="text-xs text-muted-foreground">
                <span className="tabular-nums">{school.student_count.toLocaleString("en-GB")}</span>{" "}
                {school.student_count === 1 ? "student" : "students"} at this school will show the new name.
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor={`${fieldId}-spellings`}>Other spellings</Label>
            <Textarea
              id={`${fieldId}-spellings`}
              value={spellings}
              onChange={(e) => setSpellings(e.target.value)}
              rows={3}
              placeholder="e.g. HKUGA"
            />
            <p className="text-xs text-muted-foreground">One per line, such as short forms. Searching finds the school by any of them.</p>
          </div>

          {error && <p className="text-sm text-destructive" role="alert">{error}</p>}

          <div className="flex items-center justify-end gap-3 border-t border-border pt-4">
            <Button type="button" variant="ghost" onClick={() => setOpen(false)} disabled={isPending}>
              Cancel
            </Button>
            <Button type="submit" disabled={isPending} className="min-w-[120px] gap-2">
              {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {mode === "create" ? "Add school" : "Save changes"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
