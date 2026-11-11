import { redirect } from "next/navigation"
import { requireAccess } from "@/lib/permissions/guard"
import { ACCESS, MODULES } from "@/lib/permissions/modules"

/** Adding a student happens in a drawer over the students list; old links land there. */
export default async function NewStudentPage() {
  await requireAccess(MODULES.STUDENTS, ACCESS.WRITE)
  redirect("/students?add=student")
}
