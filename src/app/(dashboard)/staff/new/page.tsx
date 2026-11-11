import { redirect } from "next/navigation"
import { requireAccess } from "@/lib/permissions/guard"
import { ACCESS, MODULES } from "@/lib/permissions/modules"

/** Adding a staff member happens in a drawer over the staff list; old links land there. */
export default async function NewStaffPage() {
  await requireAccess(MODULES.STAFF, ACCESS.WRITE)
  redirect("/staff?add=staff")
}
