"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
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
    <div className="w-full max-w-sm">
      <div className="mb-8 text-center">
        <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-lg bg-primary shadow-md shadow-primary/20">
          <span className="text-sm font-bold text-primary-foreground">AA</span>
        </div>
        <h1 className="mt-4 text-2xl font-semibold tracking-tight">New Password</h1>
        <p className="mt-1 text-sm text-muted-foreground">Enter your new password below</p>
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
              <Label htmlFor="password" className="text-xs font-medium text-muted-foreground">
                New Password
              </Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/60" />
                <Input
                  id="password"
                  name="password"
                  type="password"
                  placeholder="At least 6 characters"
                  className="pl-9 h-10 bg-muted/30 border-border/50 focus-visible:bg-background transition-colors"
                  minLength={6}
                  required
                  autoFocus
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirm" className="text-xs font-medium text-muted-foreground">
                Confirm Password
              </Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/60" />
                <Input
                  id="confirm"
                  name="confirm"
                  type="password"
                  placeholder="Repeat your password"
                  className="pl-9 h-10 bg-muted/30 border-border/50 focus-visible:bg-background transition-colors"
                  minLength={6}
                  required
                />
              </div>
            </div>

            <Button type="submit" disabled={isPending} className="w-full gap-2 h-10 shadow-sm">
              {isPending ? <><Loader2 className="h-4 w-4 animate-spin" /> Updating...</> : "Update Password"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
