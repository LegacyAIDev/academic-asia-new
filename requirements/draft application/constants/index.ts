import { Users, BookOpen, TrendingUp, Clock } from "lucide-react"
import type { Event, Stat } from "@/types"

export const STATS_DATA: Stat[] = [
  { title: "Total Students", value: "2,847", icon: Users, color: "text-blue-600", bg: "bg-blue-50" },
  { title: "Active Schools", value: "156", icon: BookOpen, color: "text-green-600", bg: "bg-green-50" },
  { title: "This Month", value: "89", icon: TrendingUp, color: "text-purple-600", bg: "bg-purple-50" },
  { title: "Pending", value: "23", icon: Clock, color: "text-orange-600", bg: "bg-orange-50" },
]

export const EVENTS_DATA: Event[] = [
  {
    id: 1,
    date: "01-OCT-2025",
    endDate: "01-OCT-2025",
    type: "Public Holiday",
    title: "NATIONAL DAY",
    color: "bg-gradient-to-r from-red-50 to-pink-50 text-red-700 border-red-200",
    icon: "🏛️",
    time: "All Day",
  },
  {
    id: 2,
    date: "06-OCT-2025",
    endDate: "06-OCT-2025",
    type: "Internal Memo",
    title: "CASUAL WEAR- MID-AUTUMN FESTIVAL 1330 OFF",
    color: "bg-gradient-to-r from-purple-50 to-indigo-50 text-purple-700 border-purple-200",
    icon: "📝",
    time: "1:30 PM",
  },
  {
    id: 3,
    date: "07-OCT-2025",
    endDate: "07-OCT-2025",
    type: "Public Holiday",
    title: "THE DAY FOLLOWING THE CHINESE MID-AUTUMN FESTIVAL",
    color: "bg-gradient-to-r from-amber-50 to-orange-50 text-amber-700 border-amber-200",
    icon: "🌕",
    time: "All Day",
  },
]

export const NAVIGATION_ITEMS = [
  { href: "#", label: "Dashboard", active: true },
  { href: "#", label: "Students", active: false },
  { href: "#", label: "Schools", active: false },
  { href: "#", label: "Events", active: false },
  { href: "#", label: "Reports", active: false },
  { href: "#", label: "Settings", active: false },
]

export const TAB_CONFIG = [
  { value: "today", label: "Today", icon: "📅" },
  { value: "weekly", label: "Weekly", icon: "📊" },
  { value: "exam", label: "Exam", icon: "📝" },
  { value: "interview", label: "Interview", icon: "🎤" },
  { value: "reminders", label: "Reminders", icon: "🔔" },
  { value: "followup", label: "Follow Up", icon: "📋" },
  { value: "focus", label: "Focus", icon: "🎯" },
] as const
