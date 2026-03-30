import { getDepartments, getAdminLevels } from "@/lib/supabase/queries/staff"
import { StaffForm } from "../staff-form"

export default async function NewStaffPage() {
  const [departments, adminLevels] = await Promise.all([
    getDepartments(),
    getAdminLevels(),
  ])

  return <StaffForm mode="create" departments={departments} adminLevels={adminLevels} />
}
