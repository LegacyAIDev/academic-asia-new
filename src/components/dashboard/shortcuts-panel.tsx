import Link from "next/link"
import type { LucideIcon } from "lucide-react"
import { DashboardPanel } from "./dashboard-panel"

export type Shortcut = { label: string; href: string; icon: LucideIcon }

/** Where common jobs start, for people still learning the menu. */
export function ShortcutsPanel({ shortcuts }: { shortcuts: Shortcut[] }) {
  if (shortcuts.length === 0) return null
  return (
    <DashboardPanel title="Shortcuts" flush>
      <ul>
        {shortcuts.map(({ label, href, icon: Icon }) => (
          <li key={label}>
            <Link href={href} className="flex items-center gap-3 px-4 py-2 text-sm text-foreground hover:bg-muted/60 hover:text-brand-navy">
              <Icon className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
              {label}
            </Link>
          </li>
        ))}
      </ul>
    </DashboardPanel>
  )
}
