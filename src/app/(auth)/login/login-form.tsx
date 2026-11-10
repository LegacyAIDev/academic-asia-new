"use client"

import { useState, useTransition } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { AuthError, AuthField, AuthHeading } from "../auth-field"
import { Button } from "@/components/ui/button"
import { Loader2, Mail, Lock } from "lucide-react"
import { createClient } from "@/lib/supabase/client"

export function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()
  const callbackError = searchParams.get('error')
  const [error, setError] = useState<string | null>(
    callbackError === 'link_expired' ? 'Your link has expired. Please request a new one.' : null
  )

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)

    const fd = new FormData(e.currentTarget)
    const email = fd.get("email") as string
    const password = fd.get("password") as string

    if (!email || !password) {
      setError("Please enter both email and password.")
      return
    }

    startTransition(async () => {
      const supabase = createClient()
      const { error: authError } = await supabase.auth.signInWithPassword({ email, password })

      if (authError) {
        setError(authError.message === "Invalid login credentials"
          ? "Invalid email or password."
          : authError.message
        )
        return
      }

      router.push("/")
      router.refresh()
    })
  }

  return (
    <>
      <AuthHeading title="Sign in">Use your Academic Asia staff email and password.</AuthHeading>

      <form onSubmit={handleSubmit} className="space-y-5" noValidate>
        {error && <AuthError>{error}</AuthError>}

        <AuthField id="email" label="Email" icon={Mail} type="email" placeholder="name@academic-asia.com"
          autoComplete="email" autoFocus required />

        <AuthField id="password" label="Password" icon={Lock} type="password" placeholder="Your password"
          autoComplete="current-password" required
          aside={<Link href="/forgot-password" className="text-sm font-medium text-primary hover:underline underline-offset-4">Forgot password?</Link>} />

        <Button type="submit" disabled={isPending} className="h-12 w-full gap-2 text-base 2xl:h-14 2xl:text-lg">
          {isPending ? <><Loader2 className="h-4 w-4 animate-spin" /> Signing in...</> : "Sign in"}
        </Button>
      </form>

      <p className="mt-8 text-sm text-muted-foreground">
        Can&apos;t sign in? Ask an administrator to check your account.
      </p>
    </>
  )
}
