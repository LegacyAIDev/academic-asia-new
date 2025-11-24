"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { CalendarIcon, MapPin, Users, FileText, CheckCircle2, ArrowLeft, ArrowRight, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { EVENT_TEMPLATES, type Event, type EventTemplate, addEvent } from "@/lib/dummy-data/events"
import { DUMMY_STUDENTS } from "@/lib/dummy-data/students"
import { DUMMY_SCHOOLS } from "@/lib/dummy-data/schools"
import { DUMMY_APPLICATIONS } from "@/lib/dummy-data/applications"

interface EventFormProps {
  event?: Event
  mode?: "create" | "edit"
}

type FormData = Omit<Event, "id" | "createdAt" | "updatedAt">

const INITIAL_FORM_DATA: FormData = {
  title: "",
  type: "Interview",
  status: "Scheduled",
  startDate: "",
  endDate: "",
  startTime: "",
  endTime: "",
  allDay: false,
  location: "",
  locationType: "Online",
  meetingUrl: "",
  studentIds: [],
  schoolIds: [],
  staffMembers: [],
  attendees: [],
  applicationIds: [],
  description: "",
  notes: "",
  agenda: [],
  reminderDays: [7, 1],
  createdBy: "Jesse CHAN",
  color: "blue",
}

const STEPS = [
  { id: 1, name: "Template", icon: Sparkles },
  { id: 2, name: "Details", icon: FileText },
  { id: 3, name: "Date & Time", icon: CalendarIcon },
  { id: 4, name: "Location", icon: MapPin },
  { id: 5, name: "Participants", icon: Users },
  { id: 6, name: "Review", icon: CheckCircle2 },
]

export function EventForm({ event, mode = "create" }: EventFormProps) {
  const router = useRouter()
  const [currentStep, setCurrentStep] = useState(1)
  const [formData, setFormData] = useState<FormData>(
    event
      ? {
          title: event.title,
          type: event.type,
          status: event.status,
          startDate: event.startDate,
          endDate: event.endDate,
          startTime: event.startTime || "",
          endTime: event.endTime || "",
          allDay: event.allDay,
          location: event.location,
          locationType: event.locationType,
          meetingUrl: event.meetingUrl || "",
          studentIds: event.studentIds || [],
          schoolIds: event.schoolIds || [],
          staffMembers: event.staffMembers || [],
          attendees: event.attendees || [],
          applicationIds: event.applicationIds || [],
          description: event.description,
          notes: event.notes || "",
          agenda: event.agenda || [],
          reminderDays: event.reminderDays || [7, 1],
          createdBy: event.createdBy,
          color: event.color,
        }
      : INITIAL_FORM_DATA,
  )
  const [selectedTemplate, setSelectedTemplate] = useState<EventTemplate | null>(null)
  const [agendaInput, setAgendaInput] = useState("")

  const updateFormData = (updates: Partial<FormData>) => {
    setFormData((prev) => ({ ...prev, ...updates }))
  }

  const handleTemplateSelect = (template: EventTemplate) => {
    setSelectedTemplate(template)
    const endTime = calculateEndTime(template.defaultDuration)

    updateFormData({
      type: template.type,
      location: template.defaultLocation,
      locationType:
        template.defaultLocation === "Online"
          ? "Online"
          : template.defaultLocation === "Office"
            ? "In-Person"
            : "In-Person",
      agenda: template.defaultAgenda || [],
      color: template.color,
      endTime,
    })

    setCurrentStep(2)
  }

  const calculateEndTime = (durationMinutes: number) => {
    if (!formData.startTime) return ""
    const [hours, minutes] = formData.startTime.split(":").map(Number)
    const totalMinutes = hours * 60 + minutes + durationMinutes
    const endHours = Math.floor(totalMinutes / 60) % 24
    const endMinutes = totalMinutes % 60
    return `${String(endHours).padStart(2, "0")}:${String(endMinutes).padStart(2, "0")}`
  }

  const handleNext = () => {
    if (currentStep < STEPS.length) {
      setCurrentStep(currentStep + 1)
    }
  }

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1)
    }
  }

  const handleSubmit = () => {
    if (mode === "create") {
      const newEvent = addEvent(formData)
      router.push(`/events/${newEvent.id}`)
    } else {
      router.push(`/events/${event?.id}`)
    }
  }

  const addAgendaItem = () => {
    if (agendaInput.trim()) {
      updateFormData({
        agenda: [...(formData.agenda || []), agendaInput.trim()],
      })
      setAgendaInput("")
    }
  }

  const removeAgendaItem = (index: number) => {
    updateFormData({
      agenda: formData.agenda?.filter((_, i) => i !== index),
    })
  }

  const toggleReminder = (days: number) => {
    const current = formData.reminderDays || []
    if (current.includes(days)) {
      updateFormData({
        reminderDays: current.filter((d) => d !== days),
      })
    } else {
      updateFormData({
        reminderDays: [...current, days].sort((a, b) => b - a),
      })
    }
  }

  const isStepValid = () => {
    switch (currentStep) {
      case 2:
        return formData.title.trim() !== "" && formData.type !== undefined
      case 3:
        return formData.startDate !== "" && (!formData.allDay ? formData.startTime !== "" : true)
      case 4:
        return formData.locationType !== undefined
      case 5:
        return true
      default:
        return true
    }
  }

  return (
    <div className="space-y-6">
      {/* Progress Steps */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            {STEPS.map((step, index) => (
              <div key={step.id} className="flex items-center">
                <div className="flex flex-col items-center">
                  <div
                    className={`flex h-10 w-10 items-center justify-center rounded-full border-2 transition-colors ${
                      currentStep === step.id
                        ? "border-blue-600 bg-blue-600 text-white"
                        : currentStep > step.id
                          ? "border-green-600 bg-green-600 text-white"
                          : "border-gray-300 bg-white text-gray-400"
                    }`}
                  >
                    <step.icon className="h-5 w-5" />
                  </div>
                  <span
                    className={`mt-2 text-xs font-medium ${currentStep === step.id ? "text-blue-600" : currentStep > step.id ? "text-green-600" : "text-gray-500"}`}
                  >
                    {step.name}
                  </span>
                </div>
                {index < STEPS.length - 1 && (
                  <div
                    className={`mx-2 h-0.5 w-12 transition-colors lg:w-16 ${currentStep > step.id ? "bg-green-600" : "bg-gray-300"}`}
                  />
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Step Content */}
      <Card>
        <CardHeader>
          <CardTitle>{STEPS[currentStep - 1].name}</CardTitle>
          <CardDescription>
            {currentStep === 1 && "Choose a template to get started quickly"}
            {currentStep === 2 && "Enter basic event information"}
            {currentStep === 3 && "Set the date and time"}
            {currentStep === 4 && "Specify location details"}
            {currentStep === 5 && "Add participants and agenda"}
            {currentStep === 6 && "Review and create your event"}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Step 1: Template Selection */}
          {currentStep === 1 && (
            <div className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                {EVENT_TEMPLATES.map((template) => (
                  <Card
                    key={template.id}
                    className={`cursor-pointer transition-all hover:shadow-md ${selectedTemplate?.id === template.id ? "ring-2 ring-blue-600" : ""}`}
                    onClick={() => handleTemplateSelect(template)}
                  >
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle className="text-lg">{template.name}</CardTitle>
                          <CardDescription className="mt-1">
                            <Badge variant="outline" className="mr-2">
                              {template.type}
                            </Badge>
                            <span className="text-sm">{template.defaultDuration} minutes</span>
                          </CardDescription>
                        </div>
                        <div className={`h-4 w-4 rounded-full bg-${template.color}-500`} />
                      </div>
                    </CardHeader>
                    {template.defaultAgenda && template.defaultAgenda.length > 0 && (
                      <CardContent>
                        <div className="space-y-1 text-sm text-muted-foreground">
                          {template.defaultAgenda.slice(0, 3).map((item, index) => (
                            <div key={index} className="flex items-center gap-2">
                              <div className="h-1 w-1 rounded-full bg-gray-400" />
                              <span>{item}</span>
                            </div>
                          ))}
                          {template.defaultAgenda.length > 3 && (
                            <div className="text-xs">+{template.defaultAgenda.length - 3} more items</div>
                          )}
                        </div>
                      </CardContent>
                    )}
                  </Card>
                ))}
              </div>

              <div className="pt-4">
                <Button
                  variant="outline"
                  className="w-full bg-transparent"
                  onClick={() => {
                    setSelectedTemplate(null)
                    setCurrentStep(2)
                  }}
                >
                  Start from Scratch
                </Button>
              </div>
            </div>
          )}

          {/* Step 2: Basic Details */}
          {currentStep === 2 && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Event Title *</Label>
                <Input
                  id="title"
                  placeholder="e.g., Abingdon School - Online Interview"
                  value={formData.title}
                  onChange={(e) => updateFormData({ title: e.target.value })}
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="type">Event Type *</Label>
                  <Select
                    value={formData.type}
                    onValueChange={(value: Event["type"]) => updateFormData({ type: value })}
                  >
                    <SelectTrigger id="type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Interview">Interview</SelectItem>
                      <SelectItem value="Assessment">Assessment</SelectItem>
                      <SelectItem value="School Visit">School Visit</SelectItem>
                      <SelectItem value="Fair">Education Fair</SelectItem>
                      <SelectItem value="Exam">Exam</SelectItem>
                      <SelectItem value="Meeting">Meeting</SelectItem>
                      <SelectItem value="Deadline">Deadline</SelectItem>
                      <SelectItem value="Holiday">Holiday</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="status">Status</Label>
                  <Select
                    value={formData.status}
                    onValueChange={(value: Event["status"]) => updateFormData({ status: value })}
                  >
                    <SelectTrigger id="status">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Scheduled">Scheduled</SelectItem>
                      <SelectItem value="Completed">Completed</SelectItem>
                      <SelectItem value="Cancelled">Cancelled</SelectItem>
                      <SelectItem value="Rescheduled">Rescheduled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  placeholder="Brief description of the event"
                  value={formData.description}
                  onChange={(e) => updateFormData({ description: e.target.value })}
                  rows={3}
                />
              </div>
            </div>
          )}

          {/* Step 3: Date & Time */}
          {currentStep === 3 && (
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="allDay"
                  checked={formData.allDay}
                  onCheckedChange={(checked) => updateFormData({ allDay: checked as boolean })}
                />
                <Label htmlFor="allDay" className="font-normal">
                  All-day event
                </Label>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="startDate">Start Date *</Label>
                  <Input
                    id="startDate"
                    type="date"
                    value={formData.startDate}
                    onChange={(e) => {
                      updateFormData({ startDate: e.target.value })
                      if (!formData.endDate) {
                        updateFormData({ endDate: e.target.value })
                      }
                    }}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="endDate">End Date</Label>
                  <Input
                    id="endDate"
                    type="date"
                    value={formData.endDate}
                    onChange={(e) => updateFormData({ endDate: e.target.value })}
                    min={formData.startDate}
                  />
                </div>
              </div>

              {!formData.allDay && (
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="startTime">Start Time *</Label>
                    <Input
                      id="startTime"
                      type="time"
                      value={formData.startTime}
                      onChange={(e) => updateFormData({ startTime: e.target.value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="endTime">End Time</Label>
                    <Input
                      id="endTime"
                      type="time"
                      value={formData.endTime}
                      onChange={(e) => updateFormData({ endTime: e.target.value })}
                      min={formData.startTime}
                    />
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label>Reminders</Label>
                <div className="flex flex-wrap gap-2">
                  {[30, 14, 7, 3, 1].map((days) => (
                    <Button
                      key={days}
                      type="button"
                      variant={formData.reminderDays?.includes(days) ? "default" : "outline"}
                      size="sm"
                      onClick={() => toggleReminder(days)}
                    >
                      {days} {days === 1 ? "day" : "days"} before
                    </Button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Step 4: Location */}
          {currentStep === 4 && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Location Type *</Label>
                <RadioGroup
                  value={formData.locationType}
                  onValueChange={(value: Event["locationType"]) => updateFormData({ locationType: value })}
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="Online" id="online" />
                    <Label htmlFor="online" className="font-normal">
                      Online
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="In-Person" id="in-person" />
                    <Label htmlFor="in-person" className="font-normal">
                      In-Person
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="Phone" id="phone" />
                    <Label htmlFor="phone" className="font-normal">
                      Phone
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="TBD" id="tbd" />
                    <Label htmlFor="tbd" className="font-normal">
                      To Be Determined
                    </Label>
                  </div>
                </RadioGroup>
              </div>

              {formData.locationType !== "TBD" && (
                <div className="space-y-2">
                  <Label htmlFor="location">{formData.locationType === "Online" ? "Platform" : "Location"}</Label>
                  <Input
                    id="location"
                    placeholder={
                      formData.locationType === "Online"
                        ? "e.g., Zoom, Microsoft Teams, Google Meet"
                        : formData.locationType === "Phone"
                          ? "Phone number or contact details"
                          : "e.g., Office Meeting Room, School Campus"
                    }
                    value={formData.location}
                    onChange={(e) => updateFormData({ location: e.target.value })}
                  />
                </div>
              )}

              {formData.locationType === "Online" && (
                <div className="space-y-2">
                  <Label htmlFor="meetingUrl">Meeting URL</Label>
                  <Input
                    id="meetingUrl"
                    type="url"
                    placeholder="https://zoom.us/j/123456789"
                    value={formData.meetingUrl}
                    onChange={(e) => updateFormData({ meetingUrl: e.target.value })}
                  />
                </div>
              )}
            </div>
          )}

          {/* Step 5: Participants & Agenda */}
          {currentStep === 5 && (
            <div className="space-y-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="students">Students</Label>
                  <Select
                    value=""
                    onValueChange={(value) => {
                      if (!formData.studentIds?.includes(value)) {
                        updateFormData({
                          studentIds: [...(formData.studentIds || []), value],
                        })
                      }
                    }}
                  >
                    <SelectTrigger id="students">
                      <SelectValue placeholder="Add student" />
                    </SelectTrigger>
                    <SelectContent>
                      {DUMMY_STUDENTS.filter((s) => !formData.studentIds?.includes(s.id)).map((student) => (
                        <SelectItem key={student.id} value={student.id}>
                          {student.surname} {student.firstName} ({student.id})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <div className="flex flex-wrap gap-2">
                    {formData.studentIds?.map((id) => {
                      const student = DUMMY_STUDENTS.find((s) => s.id === id)
                      return (
                        <Badge key={id} variant="secondary" className="gap-1">
                          {student?.surname} {student?.firstName}
                          <button
                            onClick={() =>
                              updateFormData({ studentIds: formData.studentIds?.filter((sid) => sid !== id) })
                            }
                            className="ml-1 hover:text-red-600"
                          >
                            ×
                          </button>
                        </Badge>
                      )
                    })}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="schools">Schools</Label>
                  <Select
                    value=""
                    onValueChange={(value) => {
                      if (!formData.schoolIds?.includes(value)) {
                        updateFormData({
                          schoolIds: [...(formData.schoolIds || []), value],
                        })
                      }
                    }}
                  >
                    <SelectTrigger id="schools">
                      <SelectValue placeholder="Add school" />
                    </SelectTrigger>
                    <SelectContent>
                      {DUMMY_SCHOOLS.filter((s) => !formData.schoolIds?.includes(s.id)).map((school) => (
                        <SelectItem key={school.id} value={school.id}>
                          {school.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <div className="flex flex-wrap gap-2">
                    {formData.schoolIds?.map((id) => {
                      const school = DUMMY_SCHOOLS.find((s) => s.id === id)
                      return (
                        <Badge key={id} variant="secondary" className="gap-1">
                          {school?.name}
                          <button
                            onClick={() =>
                              updateFormData({ schoolIds: formData.schoolIds?.filter((sid) => sid !== id) })
                            }
                            className="ml-1 hover:text-red-600"
                          >
                            ×
                          </button>
                        </Badge>
                      )
                    })}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="applications">Related Applications</Label>
                  <Select
                    value=""
                    onValueChange={(value) => {
                      if (!formData.applicationIds?.includes(value)) {
                        updateFormData({
                          applicationIds: [...(formData.applicationIds || []), value],
                        })
                      }
                    }}
                  >
                    <SelectTrigger id="applications">
                      <SelectValue placeholder="Link application" />
                    </SelectTrigger>
                    <SelectContent>
                      {DUMMY_APPLICATIONS.filter((a) => !formData.applicationIds?.includes(a.id)).map((app) => {
                        const student = DUMMY_STUDENTS.find((s) => s.id === app.studentId)
                        const school = DUMMY_SCHOOLS.find((s) => s.id === app.schoolId)
                        return (
                          <SelectItem key={app.id} value={app.id}>
                            {student?.surname} {student?.firstName} → {school?.name}
                          </SelectItem>
                        )
                      })}
                    </SelectContent>
                  </Select>
                  <div className="flex flex-wrap gap-2">
                    {formData.applicationIds?.map((id) => {
                      const app = DUMMY_APPLICATIONS.find((a) => a.id === id)
                      const student = DUMMY_STUDENTS.find((s) => s.id === app?.studentId)
                      const school = DUMMY_SCHOOLS.find((s) => s.id === app?.schoolId)
                      return (
                        <Badge key={id} variant="secondary" className="gap-1">
                          {student?.surname} {student?.firstName} → {school?.name}
                          <button
                            onClick={() =>
                              updateFormData({ applicationIds: formData.applicationIds?.filter((aid) => aid !== id) })
                            }
                            className="ml-1 hover:text-red-600"
                          >
                            ×
                          </button>
                        </Badge>
                      )
                    })}
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Agenda / Checklist</Label>
                <div className="flex gap-2">
                  <Input
                    placeholder="Add agenda item"
                    value={agendaInput}
                    onChange={(e) => setAgendaInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault()
                        addAgendaItem()
                      }
                    }}
                  />
                  <Button type="button" onClick={addAgendaItem}>
                    Add
                  </Button>
                </div>
                {formData.agenda && formData.agenda.length > 0 && (
                  <div className="space-y-2">
                    {formData.agenda.map((item, index) => (
                      <div key={index} className="flex items-center justify-between rounded-md border p-2">
                        <div className="flex items-center gap-2">
                          <div className="h-2 w-2 rounded-full bg-gray-400" />
                          <span className="text-sm">{item}</span>
                        </div>
                        <Button variant="ghost" size="sm" onClick={() => removeAgendaItem(index)}>
                          Remove
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  placeholder="Additional notes or instructions"
                  value={formData.notes}
                  onChange={(e) => updateFormData({ notes: e.target.value })}
                  rows={3}
                />
              </div>
            </div>
          )}

          {/* Step 6: Review */}
          {currentStep === 6 && (
            <div className="space-y-6">
              <div className="rounded-lg border bg-muted/50 p-4">
                <h3 className="mb-4 font-semibold">Event Summary</h3>
                <div className="space-y-3 text-sm">
                  <div className="flex items-start justify-between">
                    <span className="text-muted-foreground">Title:</span>
                    <span className="font-medium">{formData.title}</span>
                  </div>
                  <div className="flex items-start justify-between">
                    <span className="text-muted-foreground">Type:</span>
                    <Badge>{formData.type}</Badge>
                  </div>
                  <div className="flex items-start justify-between">
                    <span className="text-muted-foreground">Date:</span>
                    <span className="font-medium">
                      {new Date(formData.startDate).toLocaleDateString("en-GB", {
                        weekday: "short",
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })}
                      {formData.startDate !== formData.endDate &&
                        ` - ${new Date(formData.endDate).toLocaleDateString("en-GB", {
                          weekday: "short",
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                        })}`}
                    </span>
                  </div>
                  {!formData.allDay && formData.startTime && (
                    <div className="flex items-start justify-between">
                      <span className="text-muted-foreground">Time:</span>
                      <span className="font-medium">
                        {formData.startTime}
                        {formData.endTime && ` - ${formData.endTime}`}
                      </span>
                    </div>
                  )}
                  <div className="flex items-start justify-between">
                    <span className="text-muted-foreground">Location:</span>
                    <span className="font-medium">
                      {formData.locationType === "TBD"
                        ? "To Be Determined"
                        : formData.location || formData.locationType}
                    </span>
                  </div>
                  {formData.studentIds && formData.studentIds.length > 0 && (
                    <div className="flex items-start justify-between">
                      <span className="text-muted-foreground">Students:</span>
                      <span className="font-medium">{formData.studentIds.length} selected</span>
                    </div>
                  )}
                  {formData.schoolIds && formData.schoolIds.length > 0 && (
                    <div className="flex items-start justify-between">
                      <span className="text-muted-foreground">Schools:</span>
                      <span className="font-medium">{formData.schoolIds.length} selected</span>
                    </div>
                  )}
                  {formData.agenda && formData.agenda.length > 0 && (
                    <div className="flex items-start justify-between">
                      <span className="text-muted-foreground">Agenda Items:</span>
                      <span className="font-medium">{formData.agenda.length} items</span>
                    </div>
                  )}
                  {formData.reminderDays && formData.reminderDays.length > 0 && (
                    <div className="flex items-start justify-between">
                      <span className="text-muted-foreground">Reminders:</span>
                      <span className="font-medium">{formData.reminderDays.join(", ")} days before</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900 dark:bg-blue-950 dark:text-blue-100">
                <p className="font-medium">Ready to create this event?</p>
                <p className="mt-1 text-blue-700 dark:text-blue-300">
                  {formData.reminderDays && formData.reminderDays.length > 0
                    ? "Reminders will be sent automatically based on your settings."
                    : "You can add reminders after creating the event."}
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Navigation Buttons */}
      <div className="flex justify-between">
        <Button variant="outline" onClick={handleBack} disabled={currentStep === 1}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => router.back()}>
            Cancel
          </Button>
          {currentStep < STEPS.length ? (
            <Button onClick={handleNext} disabled={!isStepValid()}>
              Next
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          ) : (
            <Button onClick={handleSubmit}>
              <CheckCircle2 className="mr-2 h-4 w-4" />
              {mode === "create" ? "Create Event" : "Update Event"}
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
