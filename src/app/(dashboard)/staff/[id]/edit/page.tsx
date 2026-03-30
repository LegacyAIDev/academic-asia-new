import { notFound } from "next/navigation"
import { getStaffById, getDepartments, getAdminLevels } from "@/lib/supabase/queries/staff"
import { StaffForm } from "../../staff-form"

type EditStaffPageParams = {
  params: Promise<{ id: string }>
}

export default async function EditStaffPage({ params }: EditStaffPageParams) {
  const { id } = await params

  const [staff, departments, adminLevels] = await Promise.all([
    getStaffById(id),
    getDepartments(),
    getAdminLevels(),
  ])

  if (!staff) notFound()

  return (
    <StaffForm
      mode="edit"
      staff={staff}
      departments={departments}
      adminLevels={adminLevels}
    />
  )
}
