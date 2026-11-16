"use client"

import { useState, useTransition } from "react"
import { Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { DateField } from "@/components/ui/date-field"
import { submitRegistration } from "@/lib/supabase/actions/registration-public"

const thisYear = new Date().getFullYear()
const ENTRY_YEARS = Array.from({ length: 7 }, (_, i) => thisYear + i)

function Field({ id, label, error, children }: { id: string; label: string; error?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      {children}
      {error && <p id={`${id}-error`} className="text-sm text-destructive">{error}</p>}
    </div>
  )
}

function Section({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section className="space-y-4 rounded-lg border bg-card p-5">
      <div>
        <h2 className="text-base font-semibold">{title}</h2>
        {hint && <p className="text-sm text-muted-foreground">{hint}</p>}
      </div>
      {children}
    </section>
  )
}

/** The registration form. Everything is checked again on the server; errors show beside their fields. */
export function RegistrationForm({ token }: { token: string }) {
  const [isPending, startTransition] = useTransition()
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)
  const [gender, setGender] = useState("")
  const [entryYear, setEntryYear] = useState("")
  const [consent, setConsent] = useState(false)

  if (done) {
    return (
      <div role="status" className="mt-6 rounded-lg border bg-card p-6">
        <h2 className="text-xl font-semibold">Thank you</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          We have received the registration. Your Academic Asia consultant will be in touch soon.
        </p>
      </div>
    )
  }

  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const get = (name: string) => (form.get(name) as string | null) ?? ""
    const input = {
      first_name: get("first_name"), surname: get("surname"), chinese_name: get("chinese_name"), gender,
      date_of_birth: get("date_of_birth"), email: get("email"), mobile: get("mobile"),
      present_school: get("present_school"), entry_year: entryYear, notes: get("notes"), consent,
      mother: { name: get("mother_name"), mobile: get("mother_mobile"), email: get("mother_email") },
      father: { name: get("father_name"), mobile: get("father_mobile"), email: get("father_email") },
    }
    setError(null)
    startTransition(async () => {
      const result = await submitRegistration(token, input)
      if (result.success) return setDone(true)
      setErrors(result.errors ?? {})
      setError(result.error ?? "Please check the fields marked below.")
      window.scrollTo({ top: 0, behavior: "smooth" })
    })
  }

  return (
    <form onSubmit={submit} className="mt-6 space-y-5" noValidate>
      {error && <p role="alert" className="rounded-md border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm text-destructive">{error}</p>}

      <Section title="The student">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field id="first_name" label="First name *" error={errors.first_name}>
            <Input id="first_name" name="first_name" autoComplete="off" aria-invalid={!!errors.first_name || undefined} />
          </Field>
          <Field id="surname" label="Surname *" error={errors.surname}>
            <Input id="surname" name="surname" autoComplete="off" aria-invalid={!!errors.surname || undefined} />
          </Field>
          <Field id="chinese_name" label="Chinese name">
            <Input id="chinese_name" name="chinese_name" autoComplete="off" />
          </Field>
          <Field id="gender" label="Gender">
            <Select value={gender} onValueChange={setGender}>
              <SelectTrigger id="gender" className="w-full"><SelectValue placeholder="Choose" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="F">Female</SelectItem>
                <SelectItem value="M">Male</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <Field id="date_of_birth" label="Date of birth" error={errors.date_of_birth}>
            <DateField id="date_of_birth" name="date_of_birth" fromYear={thisYear - 25} toYear={thisYear} placeholder="Pick a date" />
          </Field>
          <Field id="present_school" label="Current school">
            <Input id="present_school" name="present_school" autoComplete="off" />
          </Field>
          <Field id="entry_year" label="Hoping to start in" error={errors.entry_year}>
            <Select value={entryYear} onValueChange={setEntryYear}>
              <SelectTrigger id="entry_year" className="w-full"><SelectValue placeholder="Choose a year" /></SelectTrigger>
              <SelectContent>
                {ENTRY_YEARS.map(year => <SelectItem key={year} value={String(year)}>September {year}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
          <Field id="email" label="Student's email" error={errors.email}>
            <Input id="email" name="email" type="email" autoComplete="off" aria-invalid={!!errors.email || undefined} />
          </Field>
          <Field id="mobile" label="Student's mobile">
            <Input id="mobile" name="mobile" type="tel" autoComplete="off" />
          </Field>
        </div>
      </Section>

      <Section title="Parents" hint="At least one parent's mobile or email, so we can reach you.">
        {errors.parents && <p role="alert" className="text-sm text-destructive">{errors.parents}</p>}
        {(["mother", "father"] as const).map(who => (
          <div key={who} className="grid gap-4 sm:grid-cols-3">
            <Field id={`${who}_name`} label={who === "mother" ? "Mother's full name" : "Father's full name"}>
              <Input id={`${who}_name`} name={`${who}_name`} autoComplete="off" />
            </Field>
            <Field id={`${who}_mobile`} label="Mobile">
              <Input id={`${who}_mobile`} name={`${who}_mobile`} type="tel" autoComplete="off" />
            </Field>
            <Field id={`${who}_email`} label="Email" error={errors[`${who}.email`]}>
              <Input id={`${who}_email`} name={`${who}_email`} type="email" autoComplete="off" aria-invalid={!!errors[`${who}.email`] || undefined} />
            </Field>
          </div>
        ))}
      </Section>

      <Section title="Anything else">
        <Field id="notes" label="Schools you are interested in, questions, or anything we should know">
          <Textarea id="notes" name="notes" rows={4} maxLength={2000} />
        </Field>
      </Section>

      <div className="space-y-1.5">
        <div className="flex items-start gap-3">
          <Checkbox id="consent" checked={consent} onCheckedChange={value => setConsent(value === true)} aria-invalid={!!errors.consent || undefined} />
          <Label htmlFor="consent" className="text-sm font-normal leading-snug">
            I agree that Academic Asia may keep these details to advise on school placement and contact us about it. *
          </Label>
        </div>
        {errors.consent && <p className="text-sm text-destructive">{errors.consent}</p>}
      </div>

      <Button type="submit" disabled={isPending} className="w-full gap-2 sm:w-auto">
        {isPending && <Loader2 className="h-4 w-4 animate-spin" />}Send registration
      </Button>
    </form>
  )
}
