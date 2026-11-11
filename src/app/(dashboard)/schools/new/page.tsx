import { redirect } from "next/navigation"
import { requireAccess } from "@/lib/permissions/guard"
import { ACCESS, MODULES } from "@/lib/permissions/modules"

/** Adding a school happens in a drawer over the schools list; old links land there. */
export default async function NewSchoolPage() {
  await requireAccess(MODULES.SCHOOLS, ACCESS.WRITE)
  redirect("/schools?add=school")
}
