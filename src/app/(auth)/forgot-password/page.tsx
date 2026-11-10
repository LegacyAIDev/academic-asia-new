"use client"

import { useState, useTransition } from "react"
import Link from "next/link"
import { AuthError, AuthField, AuthHeading } from "../auth-field"
import { Button } from "@/components/ui/button"
import { Loader2, Mail, ArrowLeft, CheckCircle2 } from "lucide-react"
import { createClient } from "@/lib/supabase/client"

export default function ForgotPasswordPage() {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [sent, setSent] = useState(false)

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)
    const email = new FormData(e.currentTarget).get("email") as string

    startTransition(async () => {
      const supabase = createClient()
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/callback?next=/reset-password`,
      })
      if (resetError) {
        setError(resetError.message)
      } else {
        setSent(true)
      }
    })
  }

  return (
    <>
      <AuthHeading title={sent ? "Check your email" : "Reset your password"}>
        {sent
          ? "We sent a link to set a new password. It may take a minute to arrive."
          : "Enter your staff email and we will send you a link to set a new password."}
      </AuthHeading>

      {sent ? (
        <div className="flex items-start gap-3 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" aria-hidden="true" />
          <p>Open the link in the email to choose your new password.</p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-5">
          {error && <AuthError>{error}</AuthError>}
          <AuthField id="email" label="Email" icon={Mail} type="email" placeholder="name@academic-asia.com"
            autoComplete="email" autoFocus required />
          <Button type="submit" disabled={isPending} className="h-12 w-full gap-2 text-base 2xl:h-14 2xl:text-lg">
            {isPending ? <><Loader2 className="h-4 w-4 animate-spin" /> Sending...</> : "Send reset link"}
          </Button>
        </form>
      )}

      <Link href="/login" className="mt-8 inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline underline-offset-4">
        <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Back to sign in
      </Link>
    </>
  )
}
