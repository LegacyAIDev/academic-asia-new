"use client"

import { useMemo, useState } from "react"
import { ChevronRight } from "lucide-react"
import { Panel, PanelEmpty } from "@/components/ui/panel"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
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
import type { SchoolEntranceExamWithJoins } from "@/lib/supabase/queries/school-entrance-exams"
import { courseEntryYears, defaultEntryYear, entryYearLabel, entryYearStart, examsForCourse } from "@/lib/schools/course-exams"
import { cn } from "@/lib/utils"
import type { CourseReferenceData } from "./course-dialog"

type SchoolCoursesSectionProps = {
  schoolId: string
  courses: SchoolCourseWithJoins[]
  referenceData: CourseReferenceData
  /** The school's entrance exams, shown beside the course they belong to. */
  exams: SchoolEntranceExamWithJoins[]
  /** Add, edit and delete are shown only to staff who may change school data. */
  canWrite?: boolean
}

/** Courses with no entry year recorded are listed under this choice. */
const NO_YEAR = "none"

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
  exams,
  canWrite = true,
}: SchoolCoursesSectionProps) {
  const years = useMemo(() => courseEntryYears(courses), [courses])
  const hasUndated = courses.some(course => entryYearStart(course.school_year) === null)
  const [entryYear, setEntryYear] = useState<string>(() => {
    const start = defaultEntryYear(years)
    return start === null ? NO_YEAR : String(start)
  })
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const yearStart = entryYear === NO_YEAR ? null : Number(entryYear)
  const shown = courses.filter(course => entryYearStart(course.school_year) === yearStart)
  const selected = shown.find(course => course.id === selectedId) ?? null
  const examsFor = (course: SchoolCourseWithJoins) => examsForCourse(exams, yearStart, course.course?.label)
  const showDescription = shown.some(course => course.description)

  const addButton = canWrite ? <CourseDialog schoolId={schoolId} referenceData={referenceData} mode="create" /> : null

  if (courses.length === 0) {
    return (
      <Panel title="Courses">
        <PanelEmpty title="No courses recorded" action={addButton}>
          Add courses offered by this school
        </PanelEmpty>
      </Panel>
    )
  }

  return (
    <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
      <Panel
        title="Courses"
        flush
        action={
          <>
            <Select value={entryYear} onValueChange={value => { setEntryYear(value); setSelectedId(null) }}>
              <SelectTrigger className="h-8 w-auto gap-1.5 text-sm" aria-label="Entry year">
                <span className="text-muted-foreground">Entry year:</span> <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {years.map(year => <SelectItem key={year} value={String(year)}>{entryYearLabel(year)}</SelectItem>)}
                {hasUndated && <SelectItem value={NO_YEAR}>Not recorded</SelectItem>}
              </SelectContent>
            </Select>
            {addButton}
          </>
        }
      >
        {shown.length === 0 ? (
          <PanelEmpty title="No courses for this entry year">Choose another entry year above.</PanelEmpty>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="pl-4 min-w-[140px]">Course</TableHead>
                  <TableHead className="min-w-[100px]">Category</TableHead>
                  {showDescription && <TableHead className="min-w-[150px]">Description</TableHead>}
                  <TableHead className="min-w-[120px]">Entrance exams</TableHead>
                  {canWrite && <TableHead className="w-[1%] pr-4"><span className="sr-only">Actions</span></TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {shown.map((item) => {
                  const cat = item.course?.category || "other"
                  const count = examsFor(item).length
                  const isSelected = item.id === selected?.id
                  return (
                    // Clicking a course shows its entrance exam format beside the list.
                    <TableRow key={item.id} data-state={isSelected ? "selected" : undefined} aria-selected={isSelected}
                      className={cn("cursor-pointer", isSelected && "bg-brand-navy/5 hover:bg-brand-navy/5")}
                      onClick={() => setSelectedId(item.id)}>
                      <TableCell className="pl-4 text-sm">
                        <button type="button" className={cn("text-left focus-visible:outline-none focus-visible:underline", isSelected ? "font-semibold" : "font-medium")}
                          aria-pressed={isSelected} onClick={event => { event.stopPropagation(); setSelectedId(item.id) }}>
                          {item.course?.label ?? "Course"}
                        </button>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={`text-xs font-medium whitespace-nowrap ${categoryColors[cat] || categoryColors.other}`}>
                          {categoryLabels[cat] || cat}
                        </Badge>
                      </TableCell>
                      {showDescription && (
                        <TableCell className="max-w-[200px] truncate text-sm text-muted-foreground">{item.description ?? ""}</TableCell>
                      )}
                      <TableCell className="text-sm">
                        {count > 0
                          ? <span className="inline-flex items-center gap-1">{count} recorded <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" aria-hidden /></span>
                          : <span className="text-muted-foreground">None</span>}
                      </TableCell>
                      {canWrite && (
                        <TableCell className="pr-4" onClick={event => event.stopPropagation()}>
                          <div className="flex items-center justify-end gap-1">
                            <EditCourseButton course={item} schoolId={schoolId} referenceData={referenceData} />
                            <DeleteCourseButton courseId={item.id} schoolId={schoolId} label={item.course?.label || "this course"} />
                          </div>
                        </TableCell>
                      )}
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </Panel>

      <CourseExamFormat course={selected} entryYear={yearStart} exams={selected ? examsFor(selected) : []} />
    </div>
  )
}

/** The entrance exam format for the chosen course, from the Entrance exams tab. */
function CourseExamFormat({ course, entryYear, exams }: {
  course: SchoolCourseWithJoins | null
  entryYear: number | null
  exams: SchoolEntranceExamWithJoins[]
}) {
  if (!course) {
    return (
      <Panel title="Entrance exam format">
        <p className="text-sm text-muted-foreground">Choose a course to see the entrance exams for that year group and entry year.</p>
      </Panel>
    )
  }
  const cat = course.course?.category || "other"
  const entry = entryYear === null ? "Entry year not recorded" : `${entryYearLabel(entryYear)} entry`

  return (
    <section aria-label="Entrance exam format" className="rounded-lg border bg-card">
      <header className="border-b px-4 py-3">
        <h2 className="text-lg font-semibold">{course.course?.label ?? "Course"}</h2>
        <p className="text-sm text-muted-foreground">{entry} · {categoryLabels[cat] || cat}</p>
      </header>
      <div className="space-y-3 p-4">
        <h3 className="text-sm font-semibold">Entrance exam format</h3>
        {exams.length === 0 ? (
          <p className="rounded-md bg-muted/50 px-3 py-3 text-sm text-muted-foreground">
            No entrance exam details recorded for this entry year and year group.
          </p>
        ) : (
          <>
            <ul className="space-y-2">
              {exams.map(exam => (
                <li key={exam.id} className="rounded-md border px-3 py-2.5">
                  <div className="flex items-baseline justify-between gap-3">
                    <p className="font-medium">{exam.subject || "Assessment"}</p>
                    {exam.duration_minutes ? <span className="shrink-0 text-sm tabular-nums text-muted-foreground">{exam.duration_minutes} min</span> : null}
                  </div>
                  {exam.exam_type && <p className="text-sm text-muted-foreground">{exam.exam_type.label}</p>}
                  {exam.exam_format && <p className="mt-1 whitespace-pre-wrap text-sm">{exam.exam_format}</p>}
                </li>
              ))}
            </ul>
            <p className="text-xs italic text-muted-foreground">From Entrance exams · {entry}</p>
          </>
        )}
      </div>
    </section>
  )
}
