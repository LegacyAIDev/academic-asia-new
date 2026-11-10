"use client"

import Image from "next/image"
import { useCallback, useEffect, useState, type ReactNode } from "react"
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet"
import type { PermissionMap } from "@/lib/permissions/modules"
import type { CurrentUser } from "@/lib/supabase/auth"
import { cn } from "@/lib/utils"
import { AccountMenu, MobileHeader } from "./header"
import { Sidebar, SidebarNav } from "./sidebar"
import { SIDEBAR_COOKIE } from "./sidebar-cookie"

/**
 * The app frame: sidebar (wide or an icon rail on desktop, a drawer under a
 * slim top bar on phones) and the page. Desktop has no top bar: the account
 * menu sits at the foot of the sidebar. The rail choice lives in a cookie for a year.
 */
export function AppShell({ user, permissions, initialCollapsed, children }: {
  user: CurrentUser | null
  permissions: PermissionMap
  initialCollapsed: boolean
  children: ReactNode
}) {
  const [collapsed, setCollapsed] = useState(initialCollapsed)
  const [drawerOpen, setDrawerOpen] = useState(false)

  const toggle = useCallback(() => {
    setCollapsed(prev => {
      document.cookie = `${SIDEBAR_COOKIE}=${prev ? "open" : "collapsed"}; path=/; max-age=31536000; samesite=lax`
      return !prev
    })
  }, [])

  // Ctrl/⌘+B, as in most editors and admin tools.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && !e.shiftKey && !e.altKey && e.key.toLowerCase() === "b") {
        e.preventDefault()
        toggle()
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [toggle])

  return (
    <>
      {/* The app shell is screen-only: printable documents live under /schools/export. */}
      <div className="print:hidden">
        <Sidebar permissions={permissions} collapsed={collapsed} onToggle={toggle} account={<AccountMenu user={user} compact={collapsed} />} />
        <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
          <SheetContent side="left" className="w-72 gap-0 overflow-y-auto p-0">
            <SheetTitle className="sr-only">Menu</SheetTitle>
            <SheetDescription className="sr-only">Pages of the Academic Asia system</SheetDescription>
            <div className="flex h-16 shrink-0 items-center px-6">
              <Image src="/brand/aa-logo-navy.png" alt="Academic Asia" width={245} height={24} className="h-auto w-[170px]" />
            </div>
            <nav aria-label="Main" className="flex flex-1 flex-col px-4 pb-4">
              <SidebarNav permissions={permissions} onNavigate={() => setDrawerOpen(false)} />
            </nav>
            <div className="border-t px-4 py-3">
              <AccountMenu user={user} />
            </div>
          </SheetContent>
        </Sheet>
      </div>
      <div className={cn("transition-[padding] duration-200 motion-reduce:transition-none print:pl-0", collapsed ? "lg:pl-[72px]" : "lg:pl-64")}>
        <div className="print:hidden">
          <MobileHeader user={user} onMenuClick={() => setDrawerOpen(true)} />
        </div>
        <main className="px-4 py-6 sm:px-6 lg:px-8 lg:py-8 print:p-0">{children}</main>
      </div>
    </>
  )
}
