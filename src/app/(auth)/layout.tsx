import Image from "next/image"
import { Cormorant } from "next/font/google"

// Only for the panel's ornamental "A", drawn like the serif A of Academic Asia's favicon; the app itself uses Inter.
const cormorant = Cormorant({ subsets: ["latin"], weight: ["500"], display: "swap" })

/**
 * Sign-in pages in Academic Asia's own brand (academic-asia.com): their navy,
 * champagne gold and wordmark. A brand panel sits beside the
 * form on large screens; narrow screens get the form under the navy wordmark.
 * Pages render only their heading and form; this layout sizes and places them.
 */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-screen bg-background lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
      <aside className="relative hidden overflow-hidden bg-brand-navy text-white lg:flex lg:flex-col lg:justify-between lg:p-14 xl:p-16 2xl:p-24">
        {/* Their favicon's serif A, cropped at the panel corner and sized to the window, is the panel's only ornament. */}
        <span
          aria-hidden="true"
          className={`${cormorant.className} pointer-events-none absolute -bottom-[0.24em] -right-[0.04em] select-none text-[26vw] font-medium leading-none text-brand-gold/[0.12]`}
        >
          A
        </span>

        <Image src="/brand/aa-logo-white.png" alt="Academic Asia" width={245} height={24} priority className="relative h-auto w-[220px] 2xl:w-[260px]" />

        <div className="relative max-w-lg 2xl:max-w-xl">
          <div className="mb-8 h-px w-16 bg-brand-gold" aria-hidden="true" />
          <p className="text-balance text-4xl font-semibold leading-[1.15] tracking-tight xl:text-5xl 2xl:text-6xl">
            Students, schools and entrance exams, in one place.
          </p>
          <p className="mt-6 text-pretty text-lg leading-relaxed text-white/70 2xl:text-xl">
            The placement system for the Academic Asia team in Hong Kong.
          </p>
        </div>

        <p className="relative text-sm text-brand-gold 2xl:text-base">For Academic Asia staff</p>
      </aside>

      <main className="flex min-h-screen flex-col px-6 py-10 sm:px-10 lg:px-16">
        <Image src="/brand/aa-logo-navy.png" alt="Academic Asia" width={245} height={24} priority className="h-auto w-[180px] lg:hidden" />

        <div className="flex flex-1 items-center justify-center py-12">
          <div className="w-full max-w-[420px] 2xl:max-w-[500px]">{children}</div>
        </div>
      </main>
    </div>
  )
}
