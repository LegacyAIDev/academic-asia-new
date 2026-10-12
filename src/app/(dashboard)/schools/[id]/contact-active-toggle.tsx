"use client"

import { useTransition } from "react"
import { useRouter } from "next/navigation"
import { Loader2, UserCheck, UserX } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { updateSchoolContact } from "@/lib/supabase/actions/school-contacts"

type Props = { contactId: string; schoolId: string; isActive: boolean; label: string }

/**
 * One click to retire a contact who has left the school, or to bring one back.
 * Nothing is deleted: an inactive contact is only left out of the main list.
 */
export function ContactActiveToggle({ contactId, schoolId, isActive, label }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const action = isActive ? "Mark inactive" : "Reactivate"
  const Icon = isPending ? Loader2 : isActive ? UserX : UserCheck

  const toggle = () => {
    startTransition(async () => {
      const result = await updateSchoolContact(contactId, schoolId, { is_active: !isActive })
      if (!result.success) {
        toast.error(result.error ?? "The contact could not be updated")
        return
      }
      toast.success(isActive ? `${label} marked inactive` : `${label} reactivated`)
      router.refresh()
    })
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      className="h-8 w-8 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10"
      title={action}
      aria-label={`${action}: ${label}`}
      disabled={isPending}
      onClick={toggle}
    >
      <Icon className={isPending ? "h-3.5 w-3.5 animate-spin" : "h-3.5 w-3.5"} />
    </Button>
  )
}
