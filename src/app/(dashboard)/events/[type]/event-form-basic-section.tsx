"use client"

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { Calendar, Tag, Radio, Eye, User } from "lucide-react"
import type { EventFormReferenceData, EventData } from "./event-form-types"
import { selectTriggerStyles } from "./event-form-types"

type Props = {
  referenceData: EventFormReferenceData
  selectedCategoryId: number | null
  onCategoryChange: (id: number) => void
  onDeliveryModeChange: (id: number) => void
  onVisibilityChange?: (id: number) => void
  event?: EventData | null
}

export function EventFormBasicSection({
  referenceData, selectedCategoryId, onCategoryChange, onDeliveryModeChange, event,
}: Props) {
  const { categories, eventTypes, deliveryModes, visibilities, profiles } = referenceData

  const filteredTypes = selectedCategoryId
    ? eventTypes.filter((t) => t.category_id === selectedCategoryId)
    : eventTypes

  const isAdmission = categories.find((c) => c.id === selectedCategoryId)?.code === "admission_assessment"
  const privateVisibilityId = visibilities.find((v) => v.code === "private")?.id

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader>
        <CardTitle className="text-base font-medium flex items-center gap-2">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          Basic Information
        </CardTitle>
        <CardDescription>Core event details and classification</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Category + Event Name */}
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Category <span className="text-destructive">*</span></Label>
            <Select
              value={selectedCategoryId?.toString() ?? ""}
              onValueChange={(v) => onCategoryChange(parseInt(v, 10))}
            >
              <SelectTrigger className={selectTriggerStyles}>
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((c) => (
                  <SelectItem key={c.id} value={c.id.toString()}>{c.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="name">Event Name <span className="text-destructive">*</span></Label>
            <Input id="name" name="name" required defaultValue={event?.name ?? ""} placeholder="e.g. UK Education Expo 2026" />
          </div>
        </div>

        {/* Event Type + Delivery Mode */}
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label className="flex items-center gap-1.5"><Tag className="h-3.5 w-3.5 text-muted-foreground" />Event Type</Label>
            <Select name="event_type_id" key={selectedCategoryId} defaultValue={event?.event_type_id?.toString() ?? ""}>
              <SelectTrigger className={selectTriggerStyles}>
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                {filteredTypes.map((t) => (
                  <SelectItem key={t.id} value={t.id.toString()}>{t.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label className="flex items-center gap-1.5"><Radio className="h-3.5 w-3.5 text-muted-foreground" />Delivery Mode</Label>
            <Select
              name="delivery_mode_id"
              defaultValue={event?.delivery_mode_id?.toString() ?? ""}
              onValueChange={(v) => onDeliveryModeChange(parseInt(v, 10))}
            >
              <SelectTrigger className={selectTriggerStyles}>
                <SelectValue placeholder="Select delivery" />
              </SelectTrigger>
              <SelectContent>
                {deliveryModes.map((d) => (
                  <SelectItem key={d.id} value={d.id.toString()}>{d.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Visibility + Assigned Staff */}
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label className="flex items-center gap-1.5"><Eye className="h-3.5 w-3.5 text-muted-foreground" />Visibility</Label>
            <Select
              name="visibility_id"
              value={isAdmission && privateVisibilityId ? privateVisibilityId.toString() : undefined}
              defaultValue={event?.visibility_id?.toString() ?? ""}
              disabled={isAdmission}
            >
              <SelectTrigger className={selectTriggerStyles}>
                <SelectValue placeholder="Select visibility" />
              </SelectTrigger>
              <SelectContent>
                {visibilities.map((v) => (
                  <SelectItem key={v.id} value={v.id.toString()}>{v.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label className="flex items-center gap-1.5"><User className="h-3.5 w-3.5 text-muted-foreground" />Assigned Staff</Label>
            <Select name="assigned_to" defaultValue={event?.assigned_to ?? "unassigned"}>
              <SelectTrigger className={selectTriggerStyles}>
                <SelectValue placeholder="Select staff" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="unassigned">Unassigned</SelectItem>
                {profiles.map((p) => (
                  <SelectItem key={p.id} value={p.id}>{p.first_name} {p.surname}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
