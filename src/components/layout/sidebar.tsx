"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useState } from "react"
import { cn } from "@/lib/utils"
import {
  Users,
  School,
  Calendar,
  Settings,
  LayoutDashboard,
  FileText,
  UserCog,
  ChevronDown,
  Sparkles,
  Building2,
  GraduationCap,
  Mic,
  CalendarDays,
} from "lucide-react"

type NavItem = {
  name: string
  href: string
  icon: React.ElementType
  children?: { name: string; href: string; icon: React.ElementType }[]
}

const navigation: NavItem[] = [
  { name: "Dashboard", href: "/", icon: LayoutDashboard },
  { name: "Students", href: "/students", icon: Users },
  { name: "Schools", href: "/schools", icon: School },
  {
    name: "Events",
    href: "/events",
    icon: Calendar,
    children: [
      { name: "General Events", href: "/events/event", icon: CalendarDays },
      { name: "Education Expo", href: "/events/expo", icon: Building2 },
      { name: "Top Schools", href: "/events/top-schools", icon: Sparkles },
      { name: "Interviews", href: "/events/interview", icon: GraduationCap },
      { name: "Music Auditions", href: "/events/music-audition", icon: Mic },
    ],
  },
  { name: "Staff", href: "/staff", icon: UserCog },
  { name: "Reports", href: "/reports", icon: FileText },
  { name: "Settings", href: "/settings", icon: Settings },
]

export function Sidebar() {
  const pathname = usePathname()
  const [expandedItems, setExpandedItems] = useState<string[]>(["Events"])

  const toggleExpanded = (name: string) => {
    setExpandedItems(prev =>
      prev.includes(name)
        ? prev.filter(item => item !== name)
        : [...prev, name]
    )
  }

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/"
    return pathname.startsWith(href)
  }

  const isChildActive = (children?: NavItem["children"]) => {
    if (!children) return false
    return children.some(child => pathname.startsWith(child.href))
  }

  return (
    <aside className="hidden lg:fixed lg:inset-y-0 lg:z-50 lg:flex lg:w-64 lg:flex-col">
      <div className="flex grow flex-col gap-y-5 overflow-y-auto border-r bg-card px-6 pb-4">
        {/* Logo */}
        <div className="flex h-16 shrink-0 items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
            <span className="text-primary-foreground font-bold text-sm">AA</span>
          </div>
          <span className="font-semibold text-lg">Academic Asia</span>
        </div>

        {/* Navigation */}
        <nav className="flex flex-1 flex-col">
          <ul role="list" className="flex flex-1 flex-col gap-y-1">
            {navigation.map((item) => {
              const hasChildren = item.children && item.children.length > 0
              const isExpanded = expandedItems.includes(item.name)
              const itemIsActive = isActive(item.href) || isChildActive(item.children)

              if (hasChildren) {
                return (
                  <li key={item.name}>
                    <button
                      onClick={() => toggleExpanded(item.name)}
                      className={cn(
                        "group flex w-full items-center justify-between rounded-md p-2 text-sm font-medium leading-6 transition-colors",
                        itemIsActive
                          ? "bg-primary/10 text-primary"
                          : "text-muted-foreground hover:bg-muted hover:text-foreground"
                      )}
                    >
                      <div className="flex items-center gap-x-3">
                        <item.icon className="h-5 w-5 shrink-0" />
                        {item.name}
                      </div>
                      <ChevronDown
                        className={cn(
                          "h-4 w-4 shrink-0 transition-transform duration-200",
                          isExpanded && "rotate-180"
                        )}
                      />
                    </button>
                    {isExpanded && (
                      <ul className="mt-1 space-y-1 pl-9">
                        {item.children!.map((child) => {
                          const childIsActive = pathname.startsWith(child.href)
                          return (
                            <li key={child.href}>
                              <Link
                                href={child.href}
                                className={cn(
                                  "group flex items-center gap-x-2 rounded-md py-1.5 px-2 text-sm font-medium transition-colors",
                                  childIsActive
                                    ? "bg-primary text-primary-foreground"
                                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                                )}
                              >
                                <child.icon className="h-4 w-4 shrink-0" />
                                {child.name}
                              </Link>
                            </li>
                          )
                        })}
                      </ul>
                    )}
                  </li>
                )
              }

              return (
                <li key={item.name}>
                  <Link
                    href={item.href}
                    className={cn(
                      "group flex gap-x-3 rounded-md p-2 text-sm font-medium leading-6 transition-colors",
                      itemIsActive
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    )}
                  >
                    <item.icon className="h-5 w-5 shrink-0" />
                    {item.name}
                  </Link>
                </li>
              )
            })}
          </ul>
        </nav>
      </div>
    </aside>
  )
}
