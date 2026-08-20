"use client"

import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { ACCESS, ACCESS_LABELS, type AccessLevel } from "@/lib/permissions/modules"

export type MatrixModule = { id: number; key: string; label: string }

type PermissionMatrixProps = {
  modules: MatrixModule[]
  /** Effective access per module id. */
  value: Record<number, AccessLevel>
  /**
   * Access the assigned level grants on its own. Supply it to show which rows
   * were overridden; omit it when editing the level defaults themselves.
   */
  inherited?: Record<number, AccessLevel>
  onChange: (moduleId: number, access: AccessLevel) => void
  /** Clears an override so the row falls back to the level default. */
  onReset?: (moduleId: number) => void
  disabled?: boolean
}

const OPTIONS: AccessLevel[] = [ACCESS.NONE, ACCESS.READ, ACCESS.WRITE]

/**
 * The legacy "Access Right" grid, one row per module.
 *
 * Radio buttons rather than the old pair of Read-Write / Read-Only checkboxes:
 * those could both be ticked, which meant nothing. One choice per row cannot
 * contradict itself.
 */
export function PermissionMatrix({
  modules,
  value,
  inherited,
  onChange,
  onReset,
  disabled = false,
}: PermissionMatrixProps) {
  return (
    <div className="rounded-lg border">
      <div className="grid grid-cols-[1fr_repeat(3,72px)_110px] items-center gap-2 border-b bg-muted/40 px-4 py-2.5 text-xs font-medium uppercase tracking-wider text-muted-foreground">
        <span>Module</span>
        {OPTIONS.map(o => (
          <span key={o} className="text-center">{ACCESS_LABELS[o]}</span>
        ))}
        <span />
      </div>

      <div className="divide-y">
        {modules.map(module => {
          const current = value[module.id] ?? ACCESS.NONE
          const base = inherited?.[module.id]
          const isOverride = base !== undefined && base !== current

          return (
            <div
              key={module.id}
              className="grid grid-cols-[1fr_repeat(3,72px)_110px] items-center gap-2 px-4 py-2.5"
            >
              <span className={cn("text-sm", disabled && "text-muted-foreground")}>
                {module.label}
              </span>

              <RadioGroup
                value={String(current)}
                onValueChange={v => onChange(module.id, Number(v) as AccessLevel)}
                disabled={disabled}
                className="contents"
              >
                {OPTIONS.map(option => (
                  <div key={option} className="flex justify-center">
                    <RadioGroupItem
                      value={String(option)}
                      id={`perm-${module.id}-${option}`}
                      aria-label={`${module.label}: ${ACCESS_LABELS[option]}`}
                    />
                  </div>
                ))}
              </RadioGroup>

              <div className="flex items-center justify-end gap-2">
                {isOverride ? (
                  <>
                    <Badge variant="outline" className="text-[10px] font-normal">
                      Overridden
                    </Badge>
                    {onReset && !disabled && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-6 px-1.5 text-xs text-muted-foreground"
                        onClick={() => onReset(module.id)}
                      >
                        Reset
                      </Button>
                    )}
                  </>
                ) : (
                  inherited !== undefined && (
                    <span className="text-[11px] text-muted-foreground">Inherited</span>
                  )
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
