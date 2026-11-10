import { cookies } from "next/headers"
import { Suspense } from "react"
import { AppShell } from "@/components/layout/app-shell"
import { SIDEBAR_COOKIE } from "@/components/layout/sidebar-cookie"
import { NavigationProgress } from "@/components/layout/navigation-progress"
import { getCurrentUser } from "@/lib/supabase/auth"
import { getPermissions } from "@/lib/permissions/resolve"

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [user, permissions, cookieStore] = await Promise.all([getCurrentUser(), getPermissions(), cookies()])

  return (
    <div className="min-h-screen bg-background">
      <Suspense fallback={null}>
        <NavigationProgress />
      </Suspense>
      <AppShell user={user} permissions={permissions} initialCollapsed={cookieStore.get(SIDEBAR_COOKIE)?.value === "collapsed"}>
        {children}
      </AppShell>
    </div>
  )
}
