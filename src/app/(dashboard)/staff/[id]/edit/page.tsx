import { redirect } from "next/navigation"
import { requireAccess } from "@/lib/permissions/guard"
import { ACCESS, MODULES } from "@/lib/permissions/modules"

type EditStaffPageParams = { params: Promise<{ id: string }> }

/** Editing happens in a drawer on the staff member's page; old links land there. */
export default async function EditStaffPage({ params }: EditStaffPageParams) {
  await requireAccess(MODULES.STAFF, ACCESS.WRITE)
  const { id } = await params
  redirect(`/staff/${id}?add=details`)
}
