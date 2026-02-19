"use client"

import { useState, useTransition } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import {
  Save,
  User,
  Phone,
  GraduationCap,
  FileText,
  Loader2,
} from "lucide-react"
import { createStudent, updateStudent, type CreateStudentInput} from "@/lib/supabase/actions/students"
import type { StudentWithJoins } from "@/lib/supabase/queries/students"

type ReferenceItem = {
  id: number
  code: string
  label: string
  category?: string | null
  region?: string | null
}

export type StudentFormProps = {
  mode: "create" | "edit"
  student?: StudentWithJoins | null
  referenceData: {
    statuses: ReferenceItem[]
    placements: ReferenceItem[]
    nationalities: ReferenceItem[]
    courses: ReferenceItem[]
    leadSources: ReferenceItem[]
    schoolTypes: ReferenceItem[]
  }
}

export function StudentForm({ mode, student, referenceData }: StudentFormProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const { statuses, placements, nationalities, courses, leadSources, schoolTypes } = referenceData

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)

    const formData = new FormData(e.currentTarget)

    const input: CreateStudentInput = {
      surname: formData.get("surname") as string,
      first_name: formData.get("first_name") as string,
      chinese_name: (formData.get("chinese_name") as string) || null,
      gender: (formData.get("gender") as string) || null,
      date_of_birth: (formData.get("date_of_birth") as string) || null,
      nationality_id: formData.get("nationality_id") ? parseInt(formData.get("nationality_id") as string, 10) : null,
      passport_type: (formData.get("passport_type") as string) || null,
      passport_number: (formData.get("passport_number") as string) || null,
      email: (formData.get("email") as string) || null,
      mobile: (formData.get("mobile") as string) || null,
      telephone: (formData.get("telephone") as string) || null,
      address_line_1: (formData.get("address_line_1") as string) || null,
      address_line_2: (formData.get("address_line_2") as string) || null,
      chinese_address: (formData.get("chinese_address") as string) || null,
      present_school: (formData.get("present_school") as string) || null,
      present_school_type_id: formData.get("present_school_type_id") ? parseInt(formData.get("present_school_type_id") as string, 10) : null,
      course_id: formData.get("course_id") ? parseInt(formData.get("course_id") as string, 10) : null,
      entry_year: (formData.get("entry_year") as string) || null,
      enrollment_date: (formData.get("enrollment_date") as string) || null,
      lead_source_id: formData.get("lead_source_id") ? parseInt(formData.get("lead_source_id") as string, 10) : null,
      status_id: formData.get("status_id") ? parseInt(formData.get("status_id") as string, 10) : null,
      placement_id: formData.get("placement_id") ? parseInt(formData.get("placement_id") as string, 10) : null,
      exam_paper: (formData.get("exam_paper") as string) || null,
      remarks: (formData.get("remarks") as string) || null,
      aa_news: formData.get("aa_news") === "on",
      airport_pickup: formData.get("airport_pickup") === "on",
    }

    startTransition(async () => {
      let result
      if (mode === "create") {
        result = await createStudent(input)
      } else if (student?.id) {
        result = await updateStudent(student.id, input)
      }

      if (result?.success) {
        if (mode === "create" && result.data?.id) {
          router.push(`/students/${result.data.id}`)
        } else if (student?.id) {
          router.push(`/students/${student.id}`)
        } else {
          router.push("/students")
        }
      } else {
        setError(result?.error ?? "An error occurred")
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Personal Information */}
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="text-base font-medium flex items-center gap-2">
            <User className="h-4 w-4 text-muted-foreground" />
            Personal Information
          </CardTitle>
          <CardDescription>Basic details about the student</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="surname">
                Surname <span className="text-destructive">*</span>
              </Label>
              <Input
                id="surname"
                name="surname"
                placeholder="e.g. CHAN"
                required
                className="uppercase"
                defaultValue={student?.surname ?? ""}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="first_name">
                First Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="first_name"
                name="first_name"
                placeholder="e.g. Sophie"
                required
                defaultValue={student?.first_name ?? ""}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="chinese_name">Chinese Name</Label>
              <Input
                id="chinese_name"
                name="chinese_name"
                placeholder="e.g. 陳思穎"
                defaultValue={student?.chinese_name ?? ""}
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-2">
              <Label htmlFor="gender">Gender</Label>
              <Select name="gender" defaultValue={student?.gender ?? ""}>
                <SelectTrigger id="gender">
                  <SelectValue placeholder="Select gender" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="M">Male</SelectItem>
                  <SelectItem value="F">Female</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="date_of_birth">Date of Birth</Label>
              <Input
                id="date_of_birth"
                name="date_of_birth"
                type="date"
                defaultValue={student?.date_of_birth ?? ""}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="nationality_id">Nationality</Label>
              <Select name="nationality_id" defaultValue={student?.nationality?.id?.toString() ?? ""}>
                <SelectTrigger id="nationality_id">
                  <SelectValue placeholder="Select nationality" />
                </SelectTrigger>
                <SelectContent>
                  {nationalities.map((nat) => (
                    <SelectItem key={nat.id} value={nat.id.toString()}>
                      {nat.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="passport_type">Passport Type</Label>
              <Input
                id="passport_type"
                name="passport_type"
                placeholder="e.g. HKSAR"
                defaultValue={student?.passport_type ?? ""}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="passport_number">Passport Number</Label>
            <Input
              id="passport_number"
              name="passport_number"
              placeholder="e.g. K1234567"
              className="max-w-xs"
              defaultValue={student?.passport_number ?? ""}
            />
          </div>
        </CardContent>
      </Card>

      {/* Contact Information */}
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="text-base font-medium flex items-center gap-2">
            <Phone className="h-4 w-4 text-muted-foreground" />
            Contact Information
          </CardTitle>
          <CardDescription>How to reach the student</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="e.g. student@email.com"
                defaultValue={student?.email ?? ""}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="mobile">Mobile Phone</Label>
              <Input
                id="mobile"
                name="mobile"
                type="tel"
                placeholder="e.g. 9123 4567"
                defaultValue={student?.mobile ?? ""}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="telephone">Telephone</Label>
              <Input
                id="telephone"
                name="telephone"
                type="tel"
                placeholder="e.g. 2577 8048"
                defaultValue={student?.telephone ?? ""}
              />
            </div>
          </div>

          <Separator />

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="address_line_1">Address (Line 1)</Label>
              <Input
                id="address_line_1"
                name="address_line_1"
                placeholder="Street address"
                defaultValue={student?.address_line_1 ?? ""}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="address_line_2">Address (Line 2)</Label>
              <Input
                id="address_line_2"
                name="address_line_2"
                placeholder="Flat/Unit, Building, City"
                defaultValue={student?.address_line_2 ?? ""}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="chinese_address">Chinese Address</Label>
            <Input
              id="chinese_address"
              name="chinese_address"
              placeholder="中文地址"
              defaultValue={student?.chinese_address ?? ""}
            />
          </div>
        </CardContent>
      </Card>

      {/* Academic Information */}
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="text-base font-medium flex items-center gap-2">
            <GraduationCap className="h-4 w-4 text-muted-foreground" />
            Academic Information
          </CardTitle>
          <CardDescription>Current school and enrollment details</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="present_school">Current School</Label>
              <Input
                id="present_school"
                name="present_school"
                placeholder="e.g. Wah Yan College, Hong Kong"
                defaultValue={student?.present_school ?? ""}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="present_school_type_id">School Type</Label>
              <Select name="present_school_type_id" defaultValue={student?.school_type?.id?.toString() ?? ""}>
                <SelectTrigger id="present_school_type_id">
                  <SelectValue placeholder="Select school type" />
                </SelectTrigger>
                <SelectContent>
                  {schoolTypes.map((type) => (
                    <SelectItem key={type.id} value={type.id.toString()}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-2">
              <Label htmlFor="course_id">Target Course</Label>
              <Select name="course_id" defaultValue={student?.course?.id?.toString() ?? ""}>
                <SelectTrigger id="course_id">
                  <SelectValue placeholder="Select course" />
                </SelectTrigger>
                <SelectContent>
                  {courses.map((course) => (
                    <SelectItem key={course.id} value={course.id.toString()}>
                      {course.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="entry_year">Entry Year</Label>
              <Input
                id="entry_year"
                name="entry_year"
                placeholder="e.g. 2024"
                pattern="\d{4}"
                maxLength={4}
                defaultValue={student?.entry_year?.slice(0, 4) ?? ""}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="enrollment_date">Enrollment Date</Label>
              <Input
                id="enrollment_date"
                name="enrollment_date"
                type="date"
                defaultValue={student?.enrollment_date ?? new Date().toISOString().split("T")[0]}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lead_source_id">Lead Source</Label>
              <Select name="lead_source_id" defaultValue={student?.lead_source?.id?.toString() ?? ""}>
                <SelectTrigger id="lead_source_id">
                  <SelectValue placeholder="How did they find us?" />
                </SelectTrigger>
                <SelectContent>
                  {leadSources.map((source) => (
                    <SelectItem key={source.id} value={source.id.toString()}>
                      {source.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-2">
              <Label htmlFor="status_id">Status</Label>
              <Select name="status_id" defaultValue={student?.status?.id?.toString() ?? statuses.find(s => s.code === 'new')?.id?.toString() ?? ""}>
                <SelectTrigger id="status_id">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  {statuses.map((status) => (
                    <SelectItem key={status.id} value={status.id.toString()}>
                      {status.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="placement_id">Lead Temperature</Label>
              <Select name="placement_id" defaultValue={student?.placement?.id?.toString() ?? placements.find(p => p.code === 'cold')?.id?.toString() ?? ""}>
                <SelectTrigger id="placement_id">
                  <SelectValue placeholder="Select lead temp" />
                </SelectTrigger>
                <SelectContent>
                  {placements.map((placement) => (
                    <SelectItem key={placement.id} value={placement.id.toString()}>
                      {placement.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 lg:col-span-2">
              <Label htmlFor="exam_paper">Exam Paper</Label>
              <Input
                id="exam_paper"
                name="exam_paper"
                placeholder="e.g. Year 12"
                defaultValue={student?.exam_paper ?? ""}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Additional Information */}
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="text-base font-medium flex items-center gap-2">
            <FileText className="h-4 w-4 text-muted-foreground" />
            Additional Information
          </CardTitle>
          <CardDescription>Preferences and notes</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex flex-wrap gap-6">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="aa_news"
                name="aa_news"
                defaultChecked={student?.aa_news ?? true}
              />
              <Label htmlFor="aa_news" className="text-sm font-normal">
                Subscribe to AA News
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="airport_pickup"
                name="airport_pickup"
                defaultChecked={student?.airport_pickup ?? false}
              />
              <Label htmlFor="airport_pickup" className="text-sm font-normal">
                Needs Airport Pickup
              </Label>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="remarks">Remarks / Notes</Label>
            <Textarea
              id="remarks"
              name="remarks"
              placeholder="Any additional notes about the student..."
              rows={4}
              defaultValue={student?.remarks ?? ""}
            />
          </div>
        </CardContent>
      </Card>

      {/* Form Actions */}
      <div className="flex items-center justify-end gap-4 pb-8">
        <Button type="button" variant="outline" asChild>
          <Link href={student?.id ? `/students/${student.id}` : "/students"}>
            Cancel
          </Link>
        </Button>
        <Button type="submit" disabled={isPending} className="gap-2">
          {isPending ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              {mode === "create" ? "Creating..." : "Saving..."}
            </>
          ) : (
            <>
              <Save className="h-4 w-4" />
              {mode === "create" ? "Create Student" : "Save Changes"}
            </>
          )}
        </Button>
      </div>
    </form>
  )
}
