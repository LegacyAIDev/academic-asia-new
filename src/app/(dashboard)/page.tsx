import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Users, School, Calendar, TrendingUp } from "lucide-react"
import { requireAccess } from "@/lib/permissions/guard"
import { MODULES } from "@/lib/permissions/modules"

const stats = [
  {
    name: "Total Students",
    value: "38,294",
    change: "+12%",
    changeType: "positive",
    icon: Users,
  },
  {
    name: "Active Schools",
    value: "1,732",
    change: "+3%",
    changeType: "positive",
    icon: School,
  },
  {
    name: "Upcoming Events",
    value: "24",
    change: "This month",
    changeType: "neutral",
    icon: Calendar,
  },
  {
    name: "Placement Rate",
    value: "94.2%",
    change: "+2.1%",
    changeType: "positive",
    icon: TrendingUp,
  },
]

export default async function DashboardPage() {
  await requireAccess(MODULES.DASHBOARD)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          Welcome back! Here&apos;s an overview of your student management system.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.name}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {stat.name}
              </CardTitle>
              <stat.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <p className="text-xs text-muted-foreground">
                <span
                  className={
                    stat.changeType === "positive"
                      ? "text-green-600"
                      : stat.changeType === "negative"
                      ? "text-red-600"
                      : ""
                  }
                >
                  {stat.change}
                </span>
                {stat.changeType !== "neutral" && " from last month"}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Recent Activity placeholder */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Recent student registrations and updates will appear here.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
