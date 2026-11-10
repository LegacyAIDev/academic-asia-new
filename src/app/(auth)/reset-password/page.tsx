"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { AuthError, AuthField, AuthHeading } from "../auth-field"
import { Button } from "@/components/ui/button"
import { Loader2, Lock } from "lucide-react"
import { createClient } from "@/lib/supabase/client"

export default function ResetPasswordPage() {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)

    const fd = new FormData(e.currentTarget)
    const password = fd.get("password") as string
    const confirm = fd.get("confirm") as string

    if (password !== confirm) {
      setError("Passwords do not match.")
      return
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters.")
      return
    }

    startTransition(async () => {
      const supabase = createClient()
      const { error: updateError } = await supabase.auth.updateUser({ password })

      if (updateError) {
        setError(updateError.message)
        return
      }

      router.push("/")
      router.refresh()
    })
  }

  return (
    <>
      <AuthHeading title="Choose a new password">Use at least 6 characters. You will be signed in afterwards.</AuthHeading>

      <form onSubmit={handleSubmit} className="space-y-5">
        {error && <AuthError>{error}</AuthError>}
        <AuthField id="password" label="New password" icon={Lock} type="password" placeholder="At least 6 characters"
          autoComplete="new-password" minLength={6} required autoFocus />
        <AuthField id="confirm" label="Repeat new password" icon={Lock} type="password" placeholder="Type it again"
          autoComplete="new-password" minLength={6} required />
        <Button type="submit" disabled={isPending} className="h-12 w-full gap-2 text-base 2xl:h-14 2xl:text-lg">
          {isPending ? <><Loader2 className="h-4 w-4 animate-spin" /> Saving...</> : "Save new password"}
        </Button>
      </form>
    </>
  )
}
