import Image from "next/image"
import { registrationLinkStatus } from "@/lib/registration/registration-link-status"
import { RegistrationForm } from "./registration-form"

export const metadata = { title: "Student registration · Academic Asia", robots: { index: false, follow: false } }

type Params = { params: Promise<{ token: string }> }

/**
 * The families' online registration form, opened from the one-use link staff
 * send. Not signed in: the link is the permission. A used or expired link
 * shows how to get a new one instead of the form.
 */
export default async function RegisterPage({ params }: Params) {
  const { token } = await params
  const status = await registrationLinkStatus(token)

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-brand-navy px-6 py-5">
        <div className="mx-auto max-w-3xl">
          <Image src="/brand/aa-logo-white.png" alt="Academic Asia" width={245} height={24} priority className="h-auto w-[180px]" />
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-6 py-8">
        {status === "open" ? (
          <>
            <h1 className="text-2xl font-semibold tracking-tight">Student registration</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Please tell us about the student and how to reach you. It takes about five minutes; fields marked * are needed.
            </p>
            <RegistrationForm token={token} />
          </>
        ) : (
          <div className="rounded-lg border bg-card p-6">
            <h1 className="text-xl font-semibold">This link can no longer be used</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              It has expired or the form has already been sent. Please ask your Academic Asia consultant for a new link.
            </p>
          </div>
        )}
      </main>
    </div>
  )
}
