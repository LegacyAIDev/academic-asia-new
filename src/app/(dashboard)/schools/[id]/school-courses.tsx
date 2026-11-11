"use client"

import { Panel, PanelEmpty } from "@/components/ui/panel"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { CourseDialog, EditCourseButton, DeleteCourseButton } from "./course-dialog"
import type { SchoolCourseWithJoins } from "@/lib/supabase/queries/school-courses"
import type { CourseReferenceData } from "./course-dialog"

type SchoolCoursesSectionProps = {
  schoolId: string
  courses: SchoolCourseWithJoins[]
  referenceData: CourseReferenceData
  /** Add, edit and delete are shown only to staff who may change school data. */
  canWrite?: boolean
}

const categoryColors: Record<string, string> = {
  early_years: "bg-pink-50 text-pink-700 border-pink-200",
  primary: "bg-blue-50 text-blue-700 border-blue-200",
  secondary: "bg-indigo-50 text-indigo-700 border-indigo-200",
  sixth_form: "bg-purple-50 text-purple-700 border-purple-200",
  gcse: "bg-emerald-50 text-emerald-700 border-emerald-200",
  a_level: "bg-amber-50 text-amber-700 border-amber-200",
  pre_al: "bg-orange-50 text-orange-700 border-orange-200",
  ib: "bg-cyan-50 text-cyan-700 border-cyan-200",
  foundation: "bg-teal-50 text-teal-700 border-teal-200",
  english: "bg-rose-50 text-rose-700 border-rose-200",
  vocational: "bg-slate-50 text-slate-700 border-slate-200",
  other: "bg-gray-50 text-gray-700 border-gray-200",
  summer: "bg-yellow-50 text-yellow-700 border-yellow-200",
  level: "bg-violet-50 text-violet-700 border-violet-200",
}

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

export function SchoolCoursesSection({
  schoolId,
  courses,
  referenceData,
  canWrite = true,
}: SchoolCoursesSectionProps) {
  if (courses.length === 0) {
    return (
      <Panel title="Courses">
        <PanelEmpty title="No courses recorded" action={canWrite && <CourseDialog schoolId={schoolId} referenceData={referenceData} mode="create" />}>
          Add courses offered by this school
        </PanelEmpty>
      </Panel>
    )
  }

  return (
    <Panel title="Courses" flush action={<>{canWrite && <CourseDialog schoolId={schoolId} referenceData={referenceData} mode="create" />}</>}>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="pl-4 min-w-[180px]">Course</TableHead>
                <TableHead className="min-w-[100px]">Category</TableHead>
                <TableHead className="min-w-[100px]">Year</TableHead>
                <TableHead className="min-w-[150px]">Description</TableHead>
                <TableHead className="min-w-[120px]">Subject</TableHead>
                {canWrite && <TableHead className="pr-4 text-right">Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {courses.map((item) => {
                const cat = item.course?.category || "other"
                return (
                  <TableRow key={item.id}>
                    <TableCell className="pl-4 font-medium text-sm">
                      {item.course?.label ?? "—"}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={`text-xs font-medium whitespace-nowrap ${categoryColors[cat] || categoryColors.other}`}>
                        {categoryLabels[cat] || cat}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {item.school_year || "—"}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">
                      {item.description || "—"}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {item.subject || "—"}
                    </TableCell>
                    {canWrite && (
                      <TableCell className="pr-4">
                        <div className="flex items-center justify-end gap-1">
                          <EditCourseButton
                            course={item}
                            schoolId={schoolId}
                            referenceData={referenceData}
                          />
                          <DeleteCourseButton
                            courseId={item.id}
                            schoolId={schoolId}
                            label={item.course?.label || "this course"}
                          />
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
      </Panel>
  )
}
