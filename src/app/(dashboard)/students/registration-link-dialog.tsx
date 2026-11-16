"use client"

import { useState, useTransition } from "react"
import { Check, Copy, Link2, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { createRegistrationLink } from "@/lib/supabase/actions/registration-links"
import { LINK_DAYS } from "@/lib/registration/registration-days"

/**
 * "Registration link": makes a one-use link for one family to fill in the
 * registration form online. Submitting it adds the student with status New.
 */
export function RegistrationLinkDialog() {
  const [open, setOpen] = useState(false)
  const [note, setNote] = useState("")
  const [link, setLink] = useState<{ url: string; expiresAt: string } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [isPending, startTransition] = useTransition()

  const reset = (next: boolean) => {
    setOpen(next)
    if (!next) { setNote(""); setLink(null); setError(null); setCopied(false) }
  }

  const create = () => {
    setError(null)
    startTransition(async () => {
      const result = await createRegistrationLink(note)
      if (!result.success || !result.data) return setError(result.error ?? "Could not create the link.")
      setLink({ url: `${window.location.origin}/register/${result.data.token}`, expiresAt: result.data.expiresAt })
    })
  }

  const copy = async () => {
    if (!link) return
    await navigator.clipboard.writeText(link.url).catch(() => {})
    setCopied(true)
  }

  return (
    <Dialog open={open} onOpenChange={reset}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2"><Link2 className="h-4 w-4" /> Registration link</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Registration link for a family</DialogTitle>
          <DialogDescription>
            Send it to one family. They fill in the student&apos;s and parents&apos; details, and the student appears here with status New for you to check.
            The link works once and expires after {LINK_DAYS} days.
          </DialogDescription>
        </DialogHeader>

        {link ? (
          <div className="space-y-2">
            <Label htmlFor="registration-url">Link to send</Label>
            <div className="flex gap-2">
              <Input id="registration-url" readOnly value={link.url} onFocus={event => event.currentTarget.select()} className="font-mono text-xs" />
              <Button type="button" variant="outline" className="shrink-0 gap-1.5" onClick={copy}>
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}{copied ? "Copied" : "Copy"}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Expires {new Date(link.expiresAt).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}. It is shown only now, so copy it before closing.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            <Label htmlFor="registration-note">Who it is for (optional)</Label>
            <Input id="registration-note" value={note} maxLength={120} onChange={event => setNote(event.target.value)} placeholder="e.g. Chan family" />
            {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
          </div>
        )}

        <DialogFooter>
          {link ? (
            <Button type="button" onClick={() => reset(false)}>Done</Button>
          ) : (
            <>
              <Button type="button" variant="ghost" onClick={() => reset(false)} disabled={isPending}>Cancel</Button>
              <Button type="button" onClick={create} disabled={isPending} className="gap-2">
                {isPending && <Loader2 className="h-4 w-4 animate-spin" />}Create link
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
