import type { Metadata } from "next"
import { DashboardOverview } from "@/components/features/dashboard/dashboard-overview"

export const metadata: Metadata = {
  title: "Dashboard | Academic Asia",
  description: "Overview of students, applications, and events",
}

export default function DashboardPage() {
  return (
    <div className="container mx-auto p-6">
      <DashboardOverview />
    </div>
  )
}
