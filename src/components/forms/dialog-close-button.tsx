import { X } from "lucide-react"

/** The ✕ in the corner of a record form pop-up. */
export function DialogCloseButton({ onClick }: { onClick: () => void }) {
  return (
    <button type="button" aria-label="Close" onClick={onClick} className="h-8 w-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors">
      <X className="h-4 w-4" />
    </button>
  )
}
