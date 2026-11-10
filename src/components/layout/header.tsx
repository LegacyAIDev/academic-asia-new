"use client"

import Image from "next/image"
import Link from "next/link"
import { ChevronsUpDown, LogOut, Menu } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { signOut } from "@/lib/supabase/actions/auth"
import type { CurrentUser } from "@/lib/supabase/auth"
import { cn } from "@/lib/utils"

/** Phones only: the menu button and wordmark. On desktop the sidebar carries everything. */
export function MobileHeader({ user, onMenuClick }: { user: CurrentUser | null; onMenuClick: () => void }) {
  return (
    <header className="sticky top-0 z-40 flex h-14 items-center gap-x-3 border-b bg-background/95 px-4 backdrop-blur lg:hidden">
      <Button variant="ghost" size="icon" onClick={onMenuClick} aria-label="Open menu" className="-ml-2">
        <Menu className="h-5 w-5" />
      </Button>
      <Link href="/" aria-label="Academic Asia, dashboard" className="flex-1">
        <Image src="/brand/aa-logo-navy.png" alt="" width={245} height={24} className="h-auto w-[140px]" />
      </Link>
      <AccountMenu user={user} compact />
    </header>
  )
}

/**
 * The signed-in person, with sign out. Sits at the foot of the sidebar; `compact`
 * shows the initials only (slim sidebar and phone bar).
 */
export function AccountMenu({ user, compact = false }: { user: CurrentUser | null; compact?: boolean }) {
  const fullName = user ? `${user.first_name ?? ""} ${user.surname ?? ""}`.trim() || "Staff" : "Guest"
  const initials = user
    ? `${(user.first_name ?? "")[0] ?? ""}${(user.surname ?? "")[0] ?? ""}`.toUpperCase() || "?"
    : "?"

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={`Account: ${fullName}`}
        className={cn(
          "flex items-center gap-3 rounded-md text-left transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          compact ? "h-10 w-10 justify-center" : "w-full p-2",
        )}
      >
        <Avatar className="h-8 w-8">
          <AvatarFallback className="bg-brand-navy text-xs font-medium text-white">{initials}</AvatarFallback>
        </Avatar>
        {!compact && (
          <>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-medium text-foreground">{fullName}</span>
              {user?.email && <span className="block truncate text-xs text-muted-foreground">{user.email}</span>}
            </span>
            <ChevronsUpDown className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
          </>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-60" side={compact ? "bottom" : "top"} align={compact ? "end" : "start"}>
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1.5">
            <p className="text-sm font-medium leading-none">{fullName}</p>
            {user?.email && <p className="text-xs leading-none text-muted-foreground">{user.email}</p>}
            {user?.department_label && (
              <Badge variant="outline" className="mt-1 w-fit text-[10px]">{user.department_label}</Badge>
            )}
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild className="text-muted-foreground focus:text-destructive">
          <form action={signOut}>
            <button type="submit" className="flex w-full items-center gap-2">
              <LogOut className="h-4 w-4" />
              Sign out
            </button>
          </form>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
