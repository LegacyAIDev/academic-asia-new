import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { Check } from "lucide-react"
import type { SchedulerRoom, SchedulerLocation } from "@/lib/supabase/queries/scheduler-rooms"

export const COLOR_SWATCHES = ["#2563eb", "#059669", "#d97706", "#dc2626", "#7c3aed", "#0891b2"]

export function FormField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-medium text-muted-foreground">{label}</Label>
      {children}
    </div>
  )
}

type RoomFormFieldsProps = {
  room?: SchedulerRoom
  mode: "create" | "edit"
  selectableLocations: SchedulerLocation[]
  color: string | null
  setColor: (color: string | null) => void
  isExamSuitable: boolean
  setIsExamSuitable: (v: boolean) => void
  isAccessible: boolean
  setIsAccessible: (v: boolean) => void
  isActive: boolean
  setIsActive: (v: boolean) => void
}

/** All room fields shared by create and edit — extracted to keep room-dialog.tsx short. */
export function RoomFormFields({
  room, mode, selectableLocations, color, setColor,
  isExamSuitable, setIsExamSuitable, isAccessible, setIsAccessible, isActive, setIsActive,
}: RoomFormFieldsProps) {
  const inputStyles = "h-9 bg-background border-border focus:border-primary focus:ring-2 focus:ring-primary/20"

  return (
    <>
      <div className="grid grid-cols-2 gap-3">
        <FormField label="Room name *">
          <Input name="display_name" className={inputStyles} defaultValue={room?.display_name ?? ""} placeholder="e.g. Room 401" />
        </FormField>
        <FormField label="Location *">
          <Select name="location_id" defaultValue={room?.location_id ?? selectableLocations[0]?.id ?? ""}>
            <SelectTrigger className={inputStyles}>
              <SelectValue placeholder="Select location" />
            </SelectTrigger>
            <SelectContent>
              {selectableLocations.map((loc) => (
                <SelectItem key={loc.id} value={loc.id}>{loc.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FormField>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <FormField label="Floor">
          <Input name="floor" className={inputStyles} defaultValue={room?.floor ?? ""} placeholder="e.g. 4F" />
        </FormField>
        <FormField label="Room number">
          <Input name="room_number" className={inputStyles} defaultValue={room?.room_number ?? ""} placeholder="e.g. 401" />
        </FormField>
        <FormField label="Capacity *">
          <Input name="capacity" type="number" min={1} className={inputStyles} defaultValue={room?.capacity ?? 1} />
        </FormField>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="flex items-center justify-between rounded-lg border border-border px-3 py-2">
          <Label className="text-sm font-normal">Exam suitable</Label>
          <Switch checked={isExamSuitable} onCheckedChange={setIsExamSuitable} />
        </div>
        <div className="flex items-center justify-between rounded-lg border border-border px-3 py-2">
          <Label className="text-sm font-normal">Accessible</Label>
          <Switch checked={isAccessible} onCheckedChange={setIsAccessible} />
        </div>
      </div>

      <FormField label="Online exam stations">
        <Input name="online_station_count" type="number" min={0} className={`${inputStyles} w-32`} defaultValue={room?.online_station_count ?? 0} />
      </FormField>

      <FormField label="Colour">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setColor(null)}
            className={`h-7 w-7 rounded-full border-2 flex items-center justify-center text-muted-foreground ${color === null ? "border-primary" : "border-border"}`}
            title="No colour"
          >
            {color === null && <Check className="h-3.5 w-3.5" />}
          </button>
          {COLOR_SWATCHES.map((swatch) => (
            <button
              key={swatch}
              type="button"
              onClick={() => setColor(swatch)}
              className={`h-7 w-7 rounded-full border-2 flex items-center justify-center ${color === swatch ? "border-primary" : "border-transparent"}`}
              style={{ backgroundColor: swatch }}
              title={swatch}
            >
              {color === swatch && <Check className="h-3.5 w-3.5 text-white" />}
            </button>
          ))}
        </div>
      </FormField>

      <FormField label="Facilities notes">
        <Textarea
          name="facilities_notes"
          rows={2}
          className="resize-none bg-background border-border"
          defaultValue={room?.facilities_notes ?? ""}
          placeholder="Whiteboard, projector, dividers..."
        />
      </FormField>

      {mode === "edit" && (
        <div className="flex items-center justify-between rounded-lg border border-border px-3 py-2">
          <Label className="text-sm font-normal">Active</Label>
          <Switch checked={isActive} onCheckedChange={setIsActive} />
        </div>
      )}
    </>
  )
}
