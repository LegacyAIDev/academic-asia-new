"use client"

import { useState, useCallback } from "react"

export function useSidebar() {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const toggleSidebar = useCallback(() => {
    setSidebarOpen((prev) => !prev)
  }, [])

  const closeSidebar = useCallback(() => {
    setSidebarOpen(false)
  }, [])

  const openSidebar = useCallback(() => {
    setSidebarOpen(true)
  }, [])

  return {
    sidebarOpen,
    toggleSidebar,
    closeSidebar,
    openSidebar,
  }
}
