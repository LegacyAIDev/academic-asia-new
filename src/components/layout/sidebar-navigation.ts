import type { ElementType } from "react"
import {
  Building2,
  Calendar,
  CalendarClock,
  CalendarDays,
  ClipboardCheck,
  DoorOpen,
  FileText,
  GraduationCap,
  Languages,
  LayoutDashboard,
  Mic,
  School,
  Settings,
  UserCog,
  Users
} from "lucide-react"

export type NavChild = { name: string; href: string; icon: ElementType }
export type NavGroup = { label?: string; items: NavChild[] }
export type NavItem = {
  name: string
  href: string
  icon: ElementType
  children?: NavGroup[]
}

/** Sidebar entries in display order. Visibility per module is decided in the Sidebar component. */
export const navigation: NavItem[] = [
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
  {
    name: "Scheduler",
    href: "/scheduler",
    icon: CalendarClock,
    children: [
      {
        items: [
          { name: "Calendar", href: "/scheduler", icon: CalendarClock },
          { name: "Rooms", href: "/scheduler/rooms", icon: DoorOpen },
        ],
      },
    ],
  },
  { name: "Staff", href: "/staff", icon: UserCog },
  { name: "Reports", href: "/reports", icon: FileText },
  { name: "Settings", href: "/settings", icon: Settings },
]

