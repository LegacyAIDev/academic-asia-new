import Link from "next/link"
import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react"
import { TableHead } from "@/components/ui/table"
import { cn } from "@/lib/utils"

type Props = {
  label: string
  /** Where clicking the heading leads; the page decides how sorting is written into its URL. */
  href: string
  /** Direction this column is currently sorted in, or null when another column is. */
  direction: "asc" | "desc" | null
  className?: string
}

const ARIA_SORT = { asc: "ascending", desc: "descending" } as const

/**
 * Column heading that sorts a list kept in the URL. It is a plain link, so it
 * works in server-rendered tables and the sorted view can be shared.
 */
export function SortableTableHead({ label, href, direction, className }: Props) {
  const Icon = direction === "asc" ? ArrowUp : direction === "desc" ? ArrowDown : ArrowUpDown

  return (
    <TableHead className={className} aria-sort={direction ? ARIA_SORT[direction] : "none"}>
      {/* No prefetch: a table has a link per column and each would render the whole list again. */}
      <Link
        href={href}
        prefetch={false}
        scroll={false}
        className="-mx-1 inline-flex items-center gap-1 rounded-sm px-1 py-0.5 outline-none hover:text-primary focus-visible:ring-2 focus-visible:ring-ring"
      >
        {label}
        <Icon aria-hidden className={cn("h-3.5 w-3.5", direction ? "text-foreground" : "text-muted-foreground/50")} />
      </Link>
    </TableHead>
  )
}
