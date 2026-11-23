"use client"

import { DialogCloseButton } from "@/components/forms/dialog-close-button"
import { FormField } from "@/components/forms/form-field"
import { ConfirmDeleteButton } from "@/components/features/confirm-delete-button"
import { useState, useTransition } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Plus,
  Loader2,
  Pencil,
  GraduationCap,
  BookOpen,
  MessageSquare,
  Check,
} from "lucide-react"
import {
  createSchoolCourse,
  updateSchoolCourse,
  deleteSchoolCourse,
  type CreateSchoolCourseInput,
} from "@/lib/supabase/actions/school-courses"
import { getAcademicYearOptions } from "@/lib/utils"
import type { SchoolCourseWithJoins, CourseItem } from "@/lib/supabase/queries/school-courses"
import { FormSection } from "@/components/forms/form-section"
import { useAddParam } from "@/lib/students/use-add-param"

export type CourseReferenceData = { courses: CourseItem[] }

type CourseDialogProps = {
  schoolId: string
  referenceData: CourseReferenceData
  mode: "create" | "edit"
  course?: SchoolCourseWithJoins
  trigger?: React.ReactNode
}

/** Category labels for grouped course dropdown */
const categoryLabels: Record<string, string> = {
  early_years: "Early Years",
  primary: "Primary",
  secondary: "Secondary",
  sixth_form: "Sixth Form",
  gcse: "GCSE",
  a_level: "A-Level",
  pre_al: "Pre A-Level",
  ib: "IB",
  foundation: "Foundation",
  english: "English",
  vocational: "Vocational",
  other: "Other",
  summer: "Summer",
  level: "Level",
}


export function CourseDialog({ schoolId, referenceData, mode, course, trigger }: CourseDialogProps) {
  const [open, setOpen] = useAddParam(mode === "create" ? "course" : null)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const { courses } = referenceData

  const { options: schoolYearOptions, defaultYear: defaultSchoolYear } = getAcademicYearOptions()

  /** Group courses by category for the dropdown */
  const groupedCourses = courses.reduce((acc, c) => {
    const cat = c.category || "other"
    if (!acc[cat]) acc[cat] = []
    acc[cat].push(c)
    return acc
  }, {} as Record<string, CourseItem[]>)

  const handleOpenChange = (value: boolean) => {
    setOpen(value)
    if (value) setError(null)
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)
    const formData = new FormData(e.currentTarget)

    const courseId = formData.get("course_id")
    if (!courseId) {
      setError("Course is required")
      return
    }

    const input: Omit<CreateSchoolCourseInput, "school_id"> = {
      course_id: parseInt(courseId as string, 10),
      school_year: (formData.get("school_year") as string) || null,
      description: (formData.get("description") as string) || null,
      subject: (formData.get("subject") as string) || null,
      remarks: (formData.get("remarks") as string) || null,
    }

    startTransition(async () => {
      let result
      if (mode === "create") {
        result = await createSchoolCourse({ ...input, school_id: schoolId } as CreateSchoolCourseInput)
      } else if (course?.id) {
        result = await updateSchoolCourse(course.id, schoolId, input)
      }
      if (result?.success) setOpen(false)
      else setError(result?.error ?? "An error occurred")
    })
  }

  const inputStyles = "h-10 bg-background border-border focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-200"
  const selectTriggerStyles = "h-10 bg-background border-border focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-200"

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button size="sm" variant="outline" className="h-8 gap-1.5">
            <Plus className="h-3.5 w-3.5" />
            Add course
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:!max-w-[560px] !max-h-[92vh] !overflow-hidden !p-0 !gap-0 bg-background flex flex-col" showCloseButton={false}>
        <div className="relative shrink-0 border-b border-border">
          <div className="relative flex items-center gap-3 px-6 py-4">
            <div className="relative">
              <div className="relative flex h-9 w-9 items-center justify-center rounded-md bg-brand-navy/[0.07] text-brand-navy">
                <GraduationCap className="h-5 w-5" />
              </div>
            </div>
            <DialogHeader className="flex-1 space-y-1">
              <DialogTitle className="text-lg font-semibold">
                {mode === "create" ? "Add Course" : "Edit Course"}
              </DialogTitle>
              <p className="text-sm text-muted-foreground">
                {mode === "create" ? "Add a course offered by this school" : "Update course details"}
              </p>
            </DialogHeader>
            <DialogCloseButton onClick={() => setOpen(false)} />
          </div>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col min-h-0 flex-1">
          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
            {error && (
              <div className="flex items-center gap-3 rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive animate-in slide-in-from-top-2 duration-300">
                <span className="font-medium">{error}</span>
              </div>
            )}

            <FormSection icon={GraduationCap} title="Course Selection" accentColor="primary">
              <FormField label="Course *">
                <Select name="course_id" defaultValue={course?.course_id?.toString() ?? ""} required>
                  <SelectTrigger className={selectTriggerStyles}>
                    <SelectValue placeholder="Select a course" />
                  </SelectTrigger>
                  <SelectContent position="popper" className="max-h-[300px]">
                    {Object.entries(groupedCourses).map(([category, items]) => (
                      <SelectGroup key={category}>
                        <SelectLabel className="text-xs font-medium text-muted-foreground">
                          {categoryLabels[category] || category}
                        </SelectLabel>
                        {items.map((c) => (
                          <SelectItem key={c.id} value={c.id.toString()}>{c.label}</SelectItem>
                        ))}
                      </SelectGroup>
                    ))}
                  </SelectContent>
                </Select>
              </FormField>
              <FormField label="School Year">
                <Select name="school_year" defaultValue={course?.school_year ?? defaultSchoolYear}>
                  <SelectTrigger className={selectTriggerStyles}>
                    <SelectValue placeholder="Select year" />
                  </SelectTrigger>
                  <SelectContent position="popper">
                    {schoolYearOptions.map((year) => (
                      <SelectItem key={year} value={year}>{year}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormField>
            </FormSection>

            <FormSection icon={BookOpen} title="Details" accentColor="teal">
              <FormField label="Description">
                <Input name="description" className={inputStyles} defaultValue={course?.description ?? ""} placeholder="Course description" />
              </FormField>
              <FormField label="Subject">
                <Input name="subject" className={inputStyles} defaultValue={course?.subject ?? ""} placeholder="e.g. Mathematics, Science" />
              </FormField>
            </FormSection>

            <FormSection icon={MessageSquare} title="Remarks" accentColor="rose">
              <FormField label="Remarks">
                <Textarea name="remarks" rows={3} className="resize-none bg-background border-border focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-200" defaultValue={course?.remarks ?? ""} placeholder="Additional notes..." />
              </FormField>
            </FormSection>
          </div>

          <div className="shrink-0 border-t border-border bg-muted/40 px-6 py-3">
            <div className="flex items-center justify-end gap-3">
              <Button type="button" variant="ghost" onClick={() => setOpen(false)} disabled={isPending} className="text-muted-foreground hover:text-foreground">Cancel</Button>
              <Button type="submit" disabled={isPending} className="min-w-[140px] gap-2 bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20 transition-all duration-200">
                {isPending ? (<><Loader2 className="h-4 w-4 animate-spin" />{mode === "create" ? "Creating..." : "Saving..."}</>) : (<>{mode === "create" ? <Plus className="h-4 w-4" /> : <Check className="h-4 w-4" />}{mode === "create" ? "Add Course" : "Save Changes"}</>)}
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export function EditCourseButton({ course, schoolId, referenceData }: { course: SchoolCourseWithJoins; schoolId: string; referenceData: CourseReferenceData }) {
  return (
    <CourseDialog schoolId={schoolId} referenceData={referenceData} mode="edit" course={course}
      trigger={<Button aria-label="Edit" title="Edit" variant="ghost" size="icon" className="h-8 w-8 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"><Pencil className="h-3.5 w-3.5" /></Button>}
    />
  )
}

export function DeleteCourseButton({ courseId, schoolId, label }: { courseId: string; schoolId: string; label: string }) {
  return (
    <ConfirmDeleteButton
      title="Delete Course"
      description={<>Are you sure you want to delete <strong className="text-foreground">{label}</strong>? This action cannot be undone.</>}
      failMessage="Failed to delete course"
      onDelete={() => deleteSchoolCourse(courseId, schoolId)}
    />
  )
}
