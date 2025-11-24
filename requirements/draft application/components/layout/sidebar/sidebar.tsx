"use client"

import { X, GraduationCap } from "lucide-react"
import { Button } from "@/components/ui/button"
import { SidebarNav } from "./sidebar-nav"

interface SidebarProps {
  isOpen: boolean
  onClose: () => void
  activeView: "students" | "schools" | "events"
}

export function Sidebar({ isOpen, onClose, activeView }: SidebarProps) {
  return (
    <aside
      className={`
        fixed inset-y-0 left-0 z-40 w-64 bg-white border-r border-gray-200 transform transition-transform duration-300 ease-in-out
        ${isOpen ? "translate-x-0" : "-translate-x-full"}
        lg:translate-x-0
      `}
    >
      <div className="flex flex-col h-full">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="bg-blue-600 p-2 rounded-lg">
              <GraduationCap className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-gray-900">AcademicAsia</h1>
              <p className="text-xs text-gray-500">Student Management</p>
            </div>
          </div>
          <Button variant="ghost" size="icon" className="lg:hidden" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        <SidebarNav activeView={activeView} />
      </div>
    </aside>
  )
}
