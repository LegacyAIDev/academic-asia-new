"use client"

import type React from "react"
import { Sidebar } from "@/components/layout/sidebar/sidebar"
import { Header } from "@/components/layout/header"
import { useSidebar } from "@/hooks/useSidebar"
import { usePathname } from "next/navigation"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { sidebarOpen, toggleSidebar, closeSidebar } = useSidebar()
  const pathname = usePathname()

  const getActiveView = (): "students" | "schools" | "events" | "applications" => {
    if (pathname.startsWith("/students")) return "students"
    if (pathname.startsWith("/schools")) return "schools"
    if (pathname.startsWith("/events")) return "events"
    if (pathname.startsWith("/applications")) return "applications"
    return "students"
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header onMenuClick={toggleSidebar} />

      <div className="flex">
        <Sidebar isOpen={sidebarOpen} onClose={closeSidebar} activeView={getActiveView()} />

        <main className="flex-1 lg:ml-64">
          <div className="p-8">{children}</div>
        </main>
      </div>

      {sidebarOpen && <div className="fixed inset-0 bg-black/20 z-30 lg:hidden" onClick={closeSidebar} />}
    </div>
  )
}
