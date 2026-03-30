"use client"

import { useState, useTransition } from "react"
import Link from "next/link"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
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
    <div className="w-full max-w-sm">
      <div className="mb-8 text-center">
        <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-lg bg-primary shadow-md shadow-primary/20">
          <span className="text-sm font-bold text-primary-foreground">AA</span>
        </div>
        <h1 className="mt-4 text-2xl font-semibold tracking-tight">Reset Password</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Enter your email to receive a reset link
        </p>
      </div>

      <Card className="border-0 shadow-sm bg-card/80 backdrop-blur-sm">
        <CardContent className="pt-6">
          {sent ? (
            <div className="flex flex-col items-center py-6 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50 shadow-sm">
                <CheckCircle2 className="h-6 w-6 text-emerald-500" />
              </div>
              <p className="mt-4 text-sm font-medium">Check your email</p>
              <p className="mt-1.5 text-sm text-muted-foreground leading-relaxed">
                We sent a password reset link to your email address.
              </p>
              <Button variant="ghost" size="sm" className="mt-5 gap-2 text-muted-foreground hover:text-foreground" asChild>
                <Link href="/login"><ArrowLeft className="h-3.5 w-3.5" /> Back to login</Link>
              </Button>
            </div>
          ) : (
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
                    autoFocus
                    required
                  />
                </div>
              </div>

              <Button type="submit" disabled={isPending} className="w-full gap-2 h-10 shadow-sm">
                {isPending ? <><Loader2 className="h-4 w-4 animate-spin" /> Sending...</> : "Send Reset Link"}
              </Button>

              <div className="text-center pt-1">
                <Link
                  href="/login"
                  className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors"
                >
                  <ArrowLeft className="h-3 w-3" />
                  Back to login
                </Link>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
