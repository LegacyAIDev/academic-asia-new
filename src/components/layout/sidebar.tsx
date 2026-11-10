"use client"

import Image from "next/image"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useState, type ReactNode } from "react"
import { ChevronDown, PanelLeftClose, PanelLeftOpen } from "lucide-react"
import { cn } from "@/lib/utils"
import { ACCESS, type PermissionMap } from "@/lib/permissions/modules"
import { moduleForPath } from "@/lib/permissions/route-map"
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { activeChildHref, navigation, type NavGroup, type NavItem } from "./sidebar-navigation"

type SidebarNavProps = {
  /** Resolved server-side in the dashboard layout. */
  permissions: PermissionMap
  /** Icons only, each name in a tooltip; a group opens its pages in a menu. */
  collapsed?: boolean
  /** Called after a link is followed, so the phone drawer can close. */
  onNavigate?: () => void
}

const isUnder = (pathname: string, href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href))
const groupIsActive = (pathname: string, children?: NavGroup[]) =>
  (children ?? []).some(group => group.items.some(item => pathname.startsWith(item.href)))

/** The navigation list itself, shared by the desktop sidebar and the phone drawer. */
export function SidebarNav({ permissions, collapsed = false, onNavigate }: SidebarNavProps) {
  const pathname = usePathname()

  // Hide whole modules the user cannot read. Event sub-items all belong to the
  // events module, so that group hides or shows as a unit.
  const visibleNavigation = navigation.filter(
    item => (permissions[moduleForPath(item.href)] ?? ACCESS.NONE) >= ACCESS.READ,
  )
  // A group is open while the person is on one of its pages, unless they closed
  // it; any other group stays closed until opened, so the list stays short.
  const [opened, setOpened] = useState<Record<string, boolean>>({})
  const isExpanded = (item: NavItem) => opened[item.name] ?? groupIsActive(pathname, item.children)

  return (
    <TooltipProvider delayDuration={150}>
      <ul role="list" className="flex flex-1 flex-col gap-y-1">
        {visibleNavigation.map(item => {
          const active = isUnder(pathname, item.href) || groupIsActive(pathname, item.children)

          if (collapsed) {
            return (
              <li key={item.name}>
                {item.children?.length ? (
                  <CollapsedGroup item={item} active={active} pathname={pathname} />
                ) : (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Link href={item.href} aria-label={item.name} className={railItemClass(active)}>
                        <item.icon className="h-5 w-5" aria-hidden="true" />
                      </Link>
                    </TooltipTrigger>
                    <TooltipContent side="right">{item.name}</TooltipContent>
                  </Tooltip>
                )}
              </li>
            )
          }

          if (item.children?.length) {
            const expanded = isExpanded(item)
            return (
              <li key={item.name}>
                <button
                  type="button"
                  aria-expanded={expanded}
                  onClick={() => setOpened(prev => ({ ...prev, [item.name]: !expanded }))}
                  className={cn(
                    "group flex w-full items-center justify-between rounded-md p-2 text-sm font-medium leading-6 transition-colors",
                    active ? "text-brand-navy" : "text-muted-foreground hover:bg-muted hover:text-foreground",
                  )}
                >
                  <span className="flex items-center gap-x-3">
                    <item.icon className="h-5 w-5 shrink-0" aria-hidden="true" />
                    {item.name}
                  </span>
                  <ChevronDown className={cn("h-4 w-4 shrink-0 transition-transform duration-200", expanded && "rotate-180")} aria-hidden="true" />
                </button>
                {expanded && (
                  <div className="mt-1 space-y-3 pl-9">
                    {item.children.map(group => (
                      <div key={group.label ?? "default"}>
                        {group.label && (
                          <p className="px-2 pb-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/60">{group.label}</p>
                        )}
                        <ul className="space-y-0.5">
                          {group.items.map(child => (
                            <li key={child.href}>
                              <Link
                                href={child.href}
                                onClick={onNavigate}
                                className={cn(
                                  "group flex items-center gap-x-2 rounded-md px-2 py-1.5 text-sm font-medium transition-colors",
                                  child.href === activeChildHref(item.children, pathname)
                                    ? "bg-primary text-primary-foreground"
                                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                                )}
                              >
                                <child.icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                                {child.name}
                              </Link>
                            </li>
                          ))}
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
                onClick={onNavigate}
                className={cn(
                  "group flex gap-x-3 rounded-md p-2 text-sm font-medium leading-6 transition-colors",
                  active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                <item.icon className="h-5 w-5 shrink-0" aria-hidden="true" />
                {item.name}
              </Link>
            </li>
          )
        })}
      </ul>
    </TooltipProvider>
  )
}

const railItemClass = (active: boolean) =>
  cn(
    "flex h-10 w-10 items-center justify-center rounded-md transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
    active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground",
  )

/** In the slim sidebar a group's pages open in a menu beside its icon. */
function CollapsedGroup({ item, active, pathname }: { item: NavItem; active: boolean; pathname: string }) {
  const current = activeChildHref(item.children, pathname)
  return (
    <DropdownMenu>
      <Tooltip>
        <TooltipTrigger asChild>
          <DropdownMenuTrigger aria-label={item.name} className={railItemClass(active)}>
            <item.icon className="h-5 w-5" aria-hidden="true" />
          </DropdownMenuTrigger>
        </TooltipTrigger>
        <TooltipContent side="right">{item.name}</TooltipContent>
      </Tooltip>
      <DropdownMenuContent side="right" align="start" className="w-60">
        <DropdownMenuLabel>{item.name}</DropdownMenuLabel>
        {item.children!.map((group, i) => (
          <DropdownMenuGroup key={group.label ?? "default"}>
            {i > 0 && <DropdownMenuSeparator />}
            {group.label && <DropdownMenuLabel className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70">{group.label}</DropdownMenuLabel>}
            {group.items.map(child => (
              <DropdownMenuItem key={child.href} asChild className={cn(child.href === current && "bg-primary/10 font-medium text-brand-navy")}>
                <Link href={child.href}>
                  <child.icon className="h-4 w-4" aria-hidden="true" />
                  {child.name}
                </Link>
              </DropdownMenuItem>
            ))}
          </DropdownMenuGroup>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

/**
 * Desktop sidebar. It can be narrowed to an icon rail (button at the bottom, or
 * Ctrl/⌘+B) to give tables more room; the shell remembers the choice.
 */
export function Sidebar({ permissions, collapsed, onToggle, account }: {
  permissions: PermissionMap
  collapsed: boolean
  onToggle: () => void
  /** The account menu, shown at the foot. */
  account: ReactNode
}) {
  const ToggleIcon = collapsed ? PanelLeftOpen : PanelLeftClose
  return (
    <aside
      className={cn(
        "hidden transition-[width] duration-200 motion-reduce:transition-none lg:fixed lg:inset-y-0 lg:z-50 lg:flex lg:flex-col",
        collapsed ? "lg:w-[72px]" : "lg:w-64",
      )}
    >
      <div className={cn("flex grow flex-col gap-y-5 overflow-y-auto overflow-x-hidden border-r bg-card pb-3", collapsed ? "items-center px-4" : "px-4")}>
        <div className={cn("flex h-16 shrink-0 items-center", !collapsed && "px-2")}>
          {collapsed ? (
            <Link href="/" aria-label="Academic Asia, dashboard" className="rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
              <Image src="/brand/aa-mark.png" alt="" width={36} height={36} priority className="h-9 w-9 rounded-md" />
            </Link>
          ) : (
            <Image src="/brand/aa-logo-navy.png" alt="Academic Asia" width={245} height={24} priority className="h-auto w-[180px]" />
          )}
        </div>

        <nav aria-label="Main" className="flex flex-1 flex-col">
          <SidebarNav permissions={permissions} collapsed={collapsed} />
        </nav>

        <button
          type="button"
          onClick={onToggle}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          title={`${collapsed ? "Expand" : "Collapse"} sidebar (Ctrl+B)`}
          className={cn(
            "flex items-center gap-x-3 rounded-md text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            collapsed ? "h-10 w-10 justify-center" : "w-full p-2",
          )}
        >
          <ToggleIcon className="h-5 w-5 shrink-0" aria-hidden="true" />
          {!collapsed && "Collapse"}
        </button>

        <div className={cn("border-t pt-3", collapsed ? "flex justify-center" : "-mx-1 w-auto")}>{account}</div>
      </div>
    </aside>
  )
}
