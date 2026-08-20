import { Sidebar } from "@/components/layout/sidebar"
import { Header } from "@/components/layout/header"
import { getCurrentUser } from "@/lib/supabase/auth"

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const user = await getCurrentUser()

  return (
    <div className="min-h-screen bg-background">
      {/* The app shell is screen-only: printable documents live under /schools/export. */}
      <div className="print:hidden">
        <Sidebar />
      </div>
      <div className="lg:pl-64 print:pl-0">
        <div className="print:hidden">
          <Header user={user} />
        </div>
        <main className="py-6 px-4 sm:px-6 lg:px-8 print:p-0">
          {children}
        </main>
      </div>
    </div>
  )
}
