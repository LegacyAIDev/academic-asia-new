"use client"

import { useState, useTransition } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
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
    <div className="w-full max-w-sm">
      {/* Logo */}
      <div className="mb-8 text-center">
        <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-lg bg-primary shadow-md shadow-primary/20">
          <span className="text-sm font-bold text-primary-foreground">AA</span>
        </div>
        <h1 className="mt-4 text-2xl font-semibold tracking-tight">Academic Asia</h1>
        <p className="mt-1 text-sm text-muted-foreground">Sign in to your account</p>
      </div>

      <Card className="border-0 shadow-sm bg-card/80 backdrop-blur-sm">
        <CardContent className="pt-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="rounded-lg border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive">
                {error}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="email" className="text-xs font-medium text-muted-foreground">
                Email
              </Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/60" />
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="name@academic-asia.com"
                  className="pl-9 h-10 bg-muted/30 border-border/50 focus-visible:bg-background transition-colors"
                  autoComplete="email"
                  autoFocus
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-xs font-medium text-muted-foreground">
                Password
              </Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/60" />
                <Input
                  id="password"
                  name="password"
                  type="password"
                  placeholder="Enter your password"
                  className="pl-9 h-10 bg-muted/30 border-border/50 focus-visible:bg-background transition-colors"
                  autoComplete="current-password"
                  required
                />
              </div>
            </div>

            <div className="flex justify-end">
              <Link
                href="/forgot-password"
                className="text-xs text-muted-foreground hover:text-primary transition-colors"
              >
                Forgot password?
              </Link>
            </div>

            <Button type="submit" disabled={isPending} className="w-full gap-2 h-10 shadow-sm">
              {isPending ? (
                <><Loader2 className="h-4 w-4 animate-spin" /> Signing in...</>
              ) : (
                "Sign In"
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      <p className="mt-6 text-center text-xs text-muted-foreground/60">
        Staff access only
      </p>
    </div>
  )
}
