"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Info, Loader2, Save } from "lucide-react"
import { PermissionMatrix, type MatrixModule } from "@/components/permissions/permission-matrix"
import { setLevelPermissions } from "@/lib/supabase/actions/permissions"
import type { AccessLevel } from "@/lib/permissions/modules"

type AccessLevelsEditorProps = {
  adminLevels: { id: number; label: string }[]
  modules: MatrixModule[]
  levelDefaults: Record<number, Record<number, AccessLevel>>
  /** How many staff sit on each level. */
  inheritCounts: Record<number, number>
  callerLevel: number | null
}

const SUPER_ADMIN_LEVEL = 0

export function AccessLevelsEditor({
  adminLevels,
  modules,
  levelDefaults,
  inheritCounts,
  callerLevel,
}: AccessLevelsEditorProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [drafts, setDrafts] = useState(levelDefaults)

  const handleChange = (level: number, moduleId: number, access: AccessLevel) => {
    setDrafts(prev => ({ ...prev, [level]: { ...(prev[level] ?? {}), [moduleId]: access } }))
  }

  const handleSave = (level: number) => {
    startTransition(async () => {
      const result = await setLevelPermissions(level, drafts[level] ?? {})
      if (!result.success) {
        toast.error(result.error ?? "Could not save access level")
        return
      }
      toast.success("Access level saved")
      router.refresh()
    })
  }

  const firstEditable = adminLevels.find(l => l.id !== SUPER_ADMIN_LEVEL) ?? adminLevels[0]

  return (
    <Tabs defaultValue={String(firstEditable?.id ?? SUPER_ADMIN_LEVEL)}>
      <TabsList className="flex-wrap h-auto">
        {adminLevels.map(level => (
          <TabsTrigger key={level.id} value={String(level.id)}>
            {level.label}
          </TabsTrigger>
        ))}
      </TabsList>

      {adminLevels.map(level => {
        const isSuperAdmin = level.id === SUPER_ADMIN_LEVEL
        // Levels at or above the caller's own are read-only; the server rejects
        // these edits anyway, so showing them as editable would just mislead.
        const outranksCaller = callerLevel !== null && callerLevel !== SUPER_ADMIN_LEVEL && level.id < callerLevel
        const readOnly = isSuperAdmin || outranksCaller
        const count = inheritCounts[level.id] ?? 0

        return (
          <TabsContent key={level.id} value={String(level.id)} className="mt-4">
            <Card className="border-0 shadow-sm">
              <CardContent className="space-y-4 pt-6">
                {isSuperAdmin && (
                  <Alert>
                    <Info className="h-4 w-4" />
                    <AlertDescription>
                      Super Admin always resolves to full access, so these values have no
                      effect and cannot be edited.
                    </AlertDescription>
                  </Alert>
                )}

                {outranksCaller && (
                  <Alert>
                    <Info className="h-4 w-4" />
                    <AlertDescription>
                      This level is above your own, so you cannot change it.
                    </AlertDescription>
                  </Alert>
                )}

                <PermissionMatrix
                  modules={modules}
                  value={drafts[level.id] ?? {}}
                  onChange={(moduleId, access) => handleChange(level.id, moduleId, access)}
                  disabled={readOnly || isPending}
                />

                {!readOnly && (
                  <div className="flex items-center justify-between gap-4">
                    <p className="text-xs text-muted-foreground">
                      {count === 0
                        ? "No staff members are on this level."
                        : `${count} staff member${count === 1 ? "" : "s"} inherit${count === 1 ? "s" : ""} this level. Changes apply to all of them except where individually overridden.`}
                    </p>
                    <Button onClick={() => handleSave(level.id)} disabled={isPending} className="gap-2 shadow-sm">
                      {isPending
                        ? <><Loader2 className="h-4 w-4 animate-spin" />Saving...</>
                        : <><Save className="h-4 w-4" />Save Changes</>}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        )
      })}
    </Tabs>
  )
}
