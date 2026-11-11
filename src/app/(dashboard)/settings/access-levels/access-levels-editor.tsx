"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Panel } from "@/components/ui/panel"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Info, Loader2 } from "lucide-react"
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
  /** False for people who may look at access levels but not change them. */
  canWrite: boolean
}

const SUPER_ADMIN_LEVEL = 0

export function AccessLevelsEditor({
  adminLevels,
  modules,
  levelDefaults,
  inheritCounts,
  callerLevel,
  canWrite,
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
      <TabsList className="h-auto flex-wrap">
        {adminLevels.map(level => (
          <TabsTrigger key={level.id} value={String(level.id)} className="gap-1.5">
            {level.label}
            <span className="text-xs tabular-nums text-muted-foreground">{inheritCounts[level.id] ?? 0}</span>
          </TabsTrigger>
        ))}
      </TabsList>

      {adminLevels.map(level => {
        const isSuperAdmin = level.id === SUPER_ADMIN_LEVEL
        // Levels at or above the caller's own are read-only; the server rejects
        // these edits anyway, so showing them as editable would just mislead.
        const outranksCaller = callerLevel !== null && callerLevel !== SUPER_ADMIN_LEVEL && level.id < callerLevel
        const readOnly = !canWrite || isSuperAdmin || outranksCaller
        const count = inheritCounts[level.id] ?? 0

        return (
          <TabsContent key={level.id} value={String(level.id)} className="mt-4">
            <Panel
              title={level.label}
              action={<span className="text-xs text-muted-foreground">{count === 0 ? "Nobody on this level" : `${count} ${count === 1 ? "person" : "people"} on this level`}</span>}
            >
              <div className="space-y-4">
                {isSuperAdmin && (
                  <Alert>
                    <Info className="h-4 w-4" />
                    <AlertDescription>
                      Super Admin can always view and change everything, so this level cannot be edited.
                    </AlertDescription>
                  </Alert>
                )}

                {!canWrite && !isSuperAdmin && (
                  <Alert>
                    <Info className="h-4 w-4" />
                    <AlertDescription>You can see access levels but not change them.</AlertDescription>
                  </Alert>
                )}

                {canWrite && outranksCaller && (
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
                        ? "Nobody is on this level yet."
                        : `Saving changes it for ${count === 1 ? "the 1 person" : `all ${count} people`} on this level, except areas changed on their own staff page.`}
                    </p>
                    <Button onClick={() => handleSave(level.id)} disabled={isPending} className="gap-2">
                      {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                      Save {level.label}
                    </Button>
                  </div>
                )}
              </div>
            </Panel>
          </TabsContent>
        )
      })}
    </Tabs>
  )
}
