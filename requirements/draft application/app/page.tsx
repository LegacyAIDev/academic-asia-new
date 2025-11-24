"use client"

import { useState } from "react"
import { Sidebar } from "@/components/layout/sidebar/sidebar"
import { Header } from "@/components/layout/header"
import { StudentTable } from "@/components/features/students/student-table"
import { useSidebar } from "@/hooks/useSidebar"
import { redirect } from "next/navigation"

export default function HomePage() {
  redirect("/dashboard")

  const { sidebarOpen, toggleSidebar, closeSidebar } = useSidebar()
  const [activeView, setActiveView] = useState<"students" | "schools" | "events">("students")

  return (
    <div className="min-h-screen bg-gray-50">
      <Header onMenuClick={toggleSidebar} />

      <div className="flex">
        <Sidebar isOpen={sidebarOpen} onClose={closeSidebar} activeView={activeView} setActiveView={setActiveView} />

        <main className="flex-1 lg:ml-64">
          <div className="p-8">
            {activeView === "students" && <StudentTable />}
            {activeView === "schools" && <SchoolsView />}
            {activeView === "events" && <EventsView />}
          </div>
        </main>
      </div>

      {sidebarOpen && <div className="fixed inset-0 bg-black/20 z-30 lg:hidden" onClick={closeSidebar} />}
    </div>
  )
}

function SchoolsView() {
  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Schools</h1>
        <p className="text-sm text-gray-500 mt-1">
          Home / <span className="text-gray-700">Schools</span>
        </p>
      </div>
      <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
        <div className="text-4xl mb-4">🏫</div>
        <p className="text-gray-600 text-lg">Schools management will be displayed here</p>
      </div>
    </div>
  )
}

function EventsView() {
  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Events</h1>
        <p className="text-sm text-gray-500 mt-1">
          Home / <span className="text-gray-700">Events</span>
        </p>
      </div>
      <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
        <div className="text-4xl mb-4">📅</div>
        <p className="text-gray-600 text-lg">Events calendar will be displayed here</p>
      </div>
    </div>
  )
}
