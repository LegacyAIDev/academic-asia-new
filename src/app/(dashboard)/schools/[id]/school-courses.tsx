"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { GraduationCap } from "lucide-react"
import { CourseDialog, EditCourseButton, DeleteCourseButton } from "./course-dialog"
import type { SchoolCourseWithJoins } from "@/lib/supabase/queries/school-courses"
import type { CourseReferenceData } from "./course-dialog"

type SchoolCoursesSectionProps = {
  schoolId: string
  courses: SchoolCourseWithJoins[]
  referenceData: CourseReferenceData
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
}: SchoolCoursesSectionProps) {
  if (courses.length === 0) {
    return (
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-medium flex items-center gap-2">
              <GraduationCap className="h-4 w-4 text-muted-foreground" />
              Courses
            </CardTitle>
            <CourseDialog schoolId={schoolId} referenceData={referenceData} mode="create" />
          </div>
        </CardHeader>
        <CardContent className="py-8">
          <div className="text-center">
            <GraduationCap className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
            <h3 className="text-sm font-medium text-foreground mb-1">No courses recorded</h3>
            <p className="text-sm text-muted-foreground">
              Add courses offered by this school
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <CardTitle className="text-base font-medium flex items-center gap-2">
            <GraduationCap className="h-4 w-4 text-muted-foreground" />
            Courses ({courses.length})
          </CardTitle>
          <CourseDialog schoolId={schoolId} referenceData={referenceData} mode="create" />
        </div>
      </CardHeader>
      <CardContent className="px-0 pb-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="pl-6 min-w-[180px]">Course</TableHead>
                <TableHead className="min-w-[100px]">Category</TableHead>
                <TableHead className="min-w-[100px]">Year</TableHead>
                <TableHead className="min-w-[150px]">Description</TableHead>
                <TableHead className="min-w-[120px]">Subject</TableHead>
                <TableHead className="pr-6 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {courses.map((item) => {
                const cat = item.course?.category || "other"
                return (
                  <TableRow key={item.id}>
                    <TableCell className="pl-6 font-medium text-sm">
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
                    <TableCell className="pr-6">
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
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
}
