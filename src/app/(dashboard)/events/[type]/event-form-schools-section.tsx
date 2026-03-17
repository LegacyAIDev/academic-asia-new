"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import {
  Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList,
} from "@/components/ui/command"
import { Building2, ChevronsUpDown, Check, X } from "lucide-react"
import { cn } from "@/lib/utils"

type Props = {
  schools: { id: string; name: string }[]
  selectedSchoolIds: string[]
  onSchoolsChange: (ids: string[]) => void
}

/** Multi-select school picker for Engagement & Guidance events */
export function EventFormSchoolsSection({ schools, selectedSchoolIds, onSchoolsChange }: Props) {
  const [open, setOpen] = useState(false)

  const toggleSchool = (schoolId: string) => {
    onSchoolsChange(
      selectedSchoolIds.includes(schoolId)
        ? selectedSchoolIds.filter((id) => id !== schoolId)
        : [...selectedSchoolIds, schoolId]
    )
  }

  const removeSchool = (schoolId: string) => {
    onSchoolsChange(selectedSchoolIds.filter((id) => id !== schoolId))
  }

  const selectedSchools = schools.filter((s) => selectedSchoolIds.includes(s.id))

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader>
        <CardTitle className="text-base font-medium flex items-center gap-2">
          <Building2 className="h-4 w-4 text-muted-foreground" />
          Participating Schools
        </CardTitle>
        <CardDescription>Select schools attending this event</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline" role="combobox" aria-expanded={open} className="w-full justify-between font-normal">
              {selectedSchoolIds.length > 0
                ? `${selectedSchoolIds.length} school${selectedSchoolIds.length > 1 ? "s" : ""} selected`
                : "Search and select schools..."}
              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
            <Command>
              <CommandInput placeholder="Search schools..." />
              <CommandList>
                <CommandEmpty>No school found.</CommandEmpty>
                <CommandGroup>
                  {schools.map((school) => (
                    <CommandItem key={school.id} value={school.name} onSelect={() => toggleSchool(school.id)}>
                      <Check className={cn("mr-2 h-4 w-4", selectedSchoolIds.includes(school.id) ? "opacity-100" : "opacity-0")} />
                      {school.name}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>

        {/* Selected schools as badges */}
        {selectedSchools.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {selectedSchools.map((school) => (
              <Badge key={school.id} variant="secondary" className="gap-1 pr-1">
                {school.name}
                <button type="button" onClick={() => removeSchool(school.id)} className="ml-1 rounded-full p-0.5 hover:bg-muted-foreground/20">
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
