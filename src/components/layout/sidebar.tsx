"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useState } from "react"
import { cn } from "@/lib/utils"
import { ACCESS, type PermissionMap } from "@/lib/permissions/modules"
import { moduleForPath } from "@/lib/permissions/route-map"
import {
  Users,
  School,
  Calendar,
  Settings,
  LayoutDashboard,
  FileText,
  UserCog,
  ChevronDown,
  Building2,
  GraduationCap,
  Mic,
  CalendarDays,
  ClipboardCheck,
  Languages,
} from "lucide-react"

type NavChild = { name: string; href: string; icon: React.ElementType }
type NavGroup = { label?: string; items: NavChild[] }
type NavItem = {
  name: string
  href: string
  icon: React.ElementType
  children?: NavGroup[]
}

const navigation: NavItem[] = [
  { name: "Dashboard", href: "/", icon: LayoutDashboard },
  {
    name: "Students",
    href: "/students",
    icon: Users,
    children: [
      {
        items: [
          { name: "All Students", href: "/students", icon: Users },
          { name: "Brief Intro Export", href: "/students/brief-intros/export", icon: Languages },
        ],
      },
    ],
  },
  { name: "Schools", href: "/schools", icon: School },
  {
    name: "Events",
    href: "/events",
    icon: Calendar,
    children: [
      {
        items: [
          { name: "All Events", href: "/events", icon: Calendar },
        ],
      },
      {
        label: "Engagement & Guidance",
        items: [
          { name: "Expo / Fair", href: "/events/expo-fair", icon: Building2 },
          { name: "Seminar / Webinar", href: "/events/seminar-webinar", icon: CalendarDays },
          { name: "Briefing / Meeting", href: "/events/briefing-meeting", icon: CalendarDays },
          { name: "Reception / Social", href: "/events/reception-social", icon: CalendarDays },
        ],
      },
      {
        label: "Admissions & Assessment",
        items: [
          { name: "Interview Day", href: "/events/interview", icon: GraduationCap },
          { name: "Audition Day", href: "/events/audition-day", icon: Mic },
          { name: "Group Entrance Exam", href: "/events/group-entrance-exam", icon: GraduationCap },
          { name: "Assessment / Scholarship", href: "/events/school-assessment-scholarship", icon: GraduationCap },
        ],
      },
    ],
  },
  { name: "Exams", href: "/exams", icon: ClipboardCheck },
  { name: "Staff", href: "/staff", icon: UserCog },
  { name: "Reports", href: "/reports", icon: FileText },
  { name: "Settings", href: "/settings", icon: Settings },
]

type SidebarProps = {
  /** Resolved server-side in the dashboard layout. */
  permissions: PermissionMap
}

export function Sidebar({ permissions }: SidebarProps) {
  const pathname = usePathname()

  // Hide whole modules the user cannot read. Event sub-items all belong to the
  // events module, so that group hides or shows as a unit.
  const visibleNavigation = navigation.filter(
    item => (permissions[moduleForPath(item.href)] ?? ACCESS.NONE) >= ACCESS.READ,
  )
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

  const isChildActive = (children?: NavGroup[]) => {
    if (!children) return false
    return children.some(group => group.items.some(item => pathname.startsWith(item.href)))
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
            {visibleNavigation.map((item) => {
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
                      <div className="mt-1 pl-9 space-y-3">
                        {item.children!.map((group) => (
                          <div key={group.label ?? "default"}>
                            {group.label && (
                              <p className="px-2 pb-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/60">
                                {group.label}
                              </p>
                            )}
                            <ul className="space-y-0.5">
                              {group.items.map((child) => {
                                const childIsActive = child.href === "/events"
                                  ? pathname === "/events"
                                  : pathname.startsWith(child.href)
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
                          </div>
                        ))}
                      </div>
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
