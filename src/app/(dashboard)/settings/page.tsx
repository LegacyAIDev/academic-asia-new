import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ShieldCheck, ChevronRight } from "lucide-react"
import { requireAccess } from "@/lib/permissions/guard"
import { MODULES } from "@/lib/permissions/modules"

const SECTIONS = [
  {
    href: "/settings/access-levels",
    icon: ShieldCheck,
    title: "Access Levels",
    description: "Set what each access level can see and change, per module.",
  },
]

export default async function SettingsPage() {
  await requireAccess(MODULES.SETTINGS)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground mt-1">
          System configuration and access control
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {SECTIONS.map(section => (
          <Link key={section.href} href={section.href} className="group">
            <Card className="border-0 shadow-sm transition-colors hover:bg-muted/40">
              <CardHeader>
                <CardTitle className="flex items-center justify-between text-base font-medium">
                  <span className="flex items-center gap-2">
                    <section.icon className="h-4 w-4 text-muted-foreground" />
                    {section.title}
                  </span>
                  <ChevronRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                </CardTitle>
                <CardDescription>{section.description}</CardDescription>
              </CardHeader>
              <CardContent />
            </Card>
          </Link>
        ))}
      </div>
    </div>
  )
}
