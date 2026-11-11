"use client"

import Link from "next/link"
import { ChevronDown, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

const GROUPS = [
  { label: "Engagement and guidance", types: [["expo-fair", "Expo / fair"], ["seminar-webinar", "Seminar / webinar"], ["briefing-meeting", "Briefing / meeting"], ["reception-social", "Reception / social"]] },
  { label: "Admissions and assessment", types: [["interview", "Interview day"], ["audition-day", "Audition day"], ["group-entrance-exam", "Group entrance exam"], ["school-assessment-scholarship", "Assessment / scholarship"]] },
] as const

/** "Add event": pick the kind of event first, since each kind has its own form. */
export function AddEventMenu() {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button className="gap-2"><Plus className="h-4 w-4" /> Add event <ChevronDown className="h-3.5 w-3.5 opacity-70" /></Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60">
        {GROUPS.map((group, i) => (
          <DropdownMenuGroup key={group.label}>
            {i > 0 && <DropdownMenuSeparator />}
            <DropdownMenuLabel className="text-xs font-medium text-muted-foreground">{group.label}</DropdownMenuLabel>
            {group.types.map(([slug, label]) => (
              <DropdownMenuItem key={slug} asChild><Link href={`/events/${slug}/new`}>{label}</Link></DropdownMenuItem>
            ))}
          </DropdownMenuGroup>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
