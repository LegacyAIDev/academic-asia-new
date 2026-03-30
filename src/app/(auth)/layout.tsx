/** Auth layout — centered card without sidebar */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-muted/60 px-4">
      {/* Subtle decorative background elements */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-24 -right-24 h-96 w-96 rounded-full bg-primary/[0.03] blur-3xl" />
        <div className="absolute -bottom-24 -left-24 h-96 w-96 rounded-full bg-primary/[0.04] blur-3xl" />
      </div>

      <div className="relative z-10">{children}</div>
    </div>
  )
}
