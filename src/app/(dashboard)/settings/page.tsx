import { redirect } from "next/navigation"
import { requireAccess } from "@/lib/permissions/guard"
import { MODULES } from "@/lib/permissions/modules"

/** Access levels are the only setting so far, so Settings opens straight onto them. */
export default async function SettingsPage() {
  await requireAccess(MODULES.SETTINGS)
  redirect("/settings/access-levels")
}
