/**
 * Sign-in pages: a brand panel beside the form on large screens, the form
 * alone (under a small brand header) on narrow ones. Pages render only their
 * heading and form; this layout sizes and places them.
 */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-screen bg-background lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
      <aside className="relative hidden overflow-hidden bg-[oklch(0.27_0.09_262)] text-white lg:flex lg:flex-col lg:justify-between lg:p-14 xl:p-16 2xl:p-24">
        {/* The monogram, cropped at the panel corner and sized to the window, is the panel's only ornament. */}
        <span
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-[0.2em] -right-[0.12em] select-none text-[18vw] font-bold leading-none tracking-tighter text-white/[0.06]"
        >
          AA
        </span>

        <div className="relative flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-white text-base font-bold text-[oklch(0.27_0.09_262)] 2xl:h-12 2xl:w-12">
            AA
          </span>
          <span className="text-lg font-semibold 2xl:text-xl">Academic Asia</span>
        </div>

        <div className="relative max-w-lg 2xl:max-w-xl">
          <p className="text-balance text-4xl font-semibold leading-tight tracking-tight xl:text-[2.75rem] 2xl:text-[3.5rem]">
            Students, schools and entrance exams, in one place.
          </p>
          <p className="mt-5 text-pretty text-lg leading-relaxed text-white/70 2xl:text-xl">
            The placement system for the Academic Asia team in Hong Kong.
          </p>
        </div>

        <p className="relative text-sm text-white/60 2xl:text-base">For Academic Asia staff</p>
      </aside>

      <main className="flex min-h-screen flex-col px-6 py-10 sm:px-10 lg:px-16">
        <div className="flex items-center gap-2.5 lg:hidden">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-sm font-bold text-primary-foreground">
            AA
          </span>
          <span className="text-base font-semibold">Academic Asia</span>
        </div>

        <div className="flex flex-1 items-center justify-center py-12">
          <div className="w-full max-w-[420px] 2xl:max-w-[500px]">{children}</div>
        </div>
      </main>
    </div>
  )
}
