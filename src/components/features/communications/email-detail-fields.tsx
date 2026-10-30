"use client"

import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Textarea } from "@/components/ui/textarea"
import { DIRECTION_LABELS, type EmailDirection } from "@/lib/emails/email-form"
import type { EmailDraft } from "@/lib/emails/email-draft"

type Props = {
  draft: EmailDraft
  onChange: (draft: EmailDraft) => void
  idPrefix: string
  /** Field names to outline in red, from the last failed save (WEB-05). */
  invalid?: Partial<Record<keyof EmailDraft, boolean>>
}

/**
 * Header fields of an email, shared by filing, typing and editing. Read from
 * the file when there is one, but always editable so staff can correct them.
 */
export function EmailDetailFields({ draft, onChange, idPrefix, invalid = {} }: Props) {
  const set = <K extends keyof EmailDraft>(key: K, value: EmailDraft[K]) => onChange({ ...draft, [key]: value })
  const id = (name: string) => `${idPrefix}-${name}`
  const bad = (key: keyof EmailDraft) => (invalid[key] ? "border-destructive focus-visible:ring-destructive" : undefined)

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <div className="space-y-1.5 sm:col-span-2">
        <Label htmlFor={id("subject")}>Subject <span className="text-destructive">*</span></Label>
        <Input id={id("subject")} value={draft.subject} maxLength={998} required aria-invalid={invalid.subject || undefined}
          className={bad("subject")} onChange={e => set("subject", e.target.value)} />
      </div>

      <fieldset className="space-y-1.5">
        <legend className="text-sm font-medium">Direction</legend>
        <RadioGroup value={draft.direction} onValueChange={v => set("direction", v as EmailDirection)} className="flex gap-4 pt-1.5">
          {(Object.keys(DIRECTION_LABELS) as EmailDirection[]).map(d => (
            <div key={d} className="flex items-center gap-2">
              <RadioGroupItem value={d} id={id(`direction-${d}`)} />
              <Label htmlFor={id(`direction-${d}`)} className="font-normal">{DIRECTION_LABELS[d]}</Label>
            </div>
          ))}
        </RadioGroup>
      </fieldset>

      <div className="space-y-1.5">
        <Label htmlFor={id("sent-at")}>Date and time (Hong Kong) <span className="text-destructive">*</span></Label>
        <Input id={id("sent-at")} type="datetime-local" value={draft.sentAtLocal} required
          aria-invalid={invalid.sentAtLocal || undefined} className={bad("sentAtLocal")}
          onChange={e => set("sentAtLocal", e.target.value)} />
      </div>

      <div className="space-y-1.5 sm:col-span-2">
        <Label htmlFor={id("from")}>From</Label>
        <Input id={id("from")} value={draft.from} maxLength={400} placeholder="Mrs Chan <mrs.chan@example.com>"
          onChange={e => set("from", e.target.value)} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor={id("to")}>To</Label>
        <Input id={id("to")} value={draft.to} placeholder="Separate with ;" onChange={e => set("to", e.target.value)} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor={id("cc")}>Cc</Label>
        <Input id={id("cc")} value={draft.cc} placeholder="Separate with ;" onChange={e => set("cc", e.target.value)} />
      </div>

      <div className="space-y-1.5 sm:col-span-2">
        <Label htmlFor={id("note")}>Staff note</Label>
        <Textarea id={id("note")} value={draft.staffNote} maxLength={2000} rows={2}
          placeholder="Optional, e.g. Mother confirms Year 9 entry" onChange={e => set("staffNote", e.target.value)} />
      </div>
    </div>
  )
}
