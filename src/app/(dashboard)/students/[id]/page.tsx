import Link from "next/link"
import { notFound } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Separator } from "@/components/ui/separator"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import {
  ArrowLeft,
  Edit,
  Mail,
  Phone,
  MapPin,
  Calendar,
  GraduationCap,
  User,
  FileText,
  Globe,
  ClipboardList,
  MessageSquare,
  School,
  BookOpen,
  Shield,
  CalendarDays,
  Plane,
  FileCheck,
  Plus,
} from "lucide-react"
import { getStudentById, getStudentContacts, getContactReferenceData } from "@/lib/supabase/queries/students"
import { getStudentApplications, getApplicationReferenceData } from "@/lib/supabase/queries/student-applications"
import { getStudentEducation, getEducationReferenceData } from "@/lib/supabase/queries/student-education"
import { getStudentVisas, getVisaReferenceData } from "@/lib/supabase/queries/student-visas"
import { getStudentEventApplications, getEventAppReferenceData } from "@/lib/supabase/queries/student-event-applications"
import { getStudentTravel, getTravelReferenceData } from "@/lib/supabase/queries/student-travel"
import { getStudentExamResults, getExamResultReferenceData } from "@/lib/supabase/queries/student-exam-results"
import { getStudentBriefIntro, getBriefIntroReferenceData } from "@/lib/supabase/queries/student-brief-intro"
import { getStudentLogBook } from "@/lib/supabase/queries/student-log-book"
import { getStudentResume, getResumeReferenceData } from "@/lib/supabase/queries/student-resume"
import { StudentContactsSection } from "./student-contacts"
import { StudentApplicationsSection } from "./student-applications"
import { StudentEducationSection } from "./student-education"
import { StudentVisasSection } from "./student-visas"
import { StudentEventApplicationsSection } from "./student-event-applications"
import { StudentTravelSection } from "./student-travel"
import { StudentExamResultsSection } from "./student-exam-results"
import { StudentBriefIntroSection } from "./student-brief-intro"
import { StudentLogBookSection } from "./student-log-book"
import { StudentResumeSection } from "./student-resume"
import { DeleteStudentDialog } from "./delete-student-dialog"

// Status badge styling based on status code
const statusStyles: Record<string, string> = {
  active: "bg-emerald-50 text-emerald-700 border-emerald-200",
  new: "bg-indigo-50 text-indigo-700 border-indigo-200",
  pending: "bg-amber-50 text-amber-700 border-amber-200",
  closed: "bg-slate-100 text-slate-600 border-slate-200",
  dead: "bg-rose-50 text-rose-700 border-rose-200",
}

// Placement badge styling based on placement code
const placementStyles: Record<string, { color: string; label: string }> = {
  cold: { color: "bg-sky-100 text-sky-700", label: "Cold" },
  warm: { color: "bg-amber-100 text-amber-700", label: "Warm" },
  hot: { color: "bg-orange-100 text-orange-700", label: "Hot" },
  very_hot: { color: "bg-rose-100 text-rose-700", label: "Very Hot" },
}

type StudentDetailPageParams = { params: Promise<{ id: string }> }

export default async function StudentDetailPage({ params }: StudentDetailPageParams) {
  const { id } = await params

  // Fetch student, contacts, applications, and reference data in parallel
  const [
    student, contacts, contactReferenceData,
    applications, appReferenceData,
    educationEntries, eduReferenceData,
    visas, visaReferenceData,
    eventApplications, eventAppReferenceData,
    travelRecords, travelReferenceData,
    examResults, examResultReferenceData,
    briefIntro, briefIntroReferenceData,
    logEntries,
    resumeEntries, resumeReferenceData,
  ] = await Promise.all([
    getStudentById(id),
    getStudentContacts(id),
    getContactReferenceData(),
    getStudentApplications(id),
    getApplicationReferenceData(),
    getStudentEducation(id),
    getEducationReferenceData(),
    getStudentVisas(id),
    getVisaReferenceData(id),
    getStudentEventApplications(id),
    getEventAppReferenceData(),
    getStudentTravel(id),
    getTravelReferenceData(),
    getStudentExamResults(id),
    getExamResultReferenceData(),
    getStudentBriefIntro(id),
    getBriefIntroReferenceData(),
    getStudentLogBook(id),
    getStudentResume(id),
    getResumeReferenceData(),
  ])

  if (!student) {
    notFound()
  }

  const statusStyle = statusStyles[student.status?.code ?? 'new'] ?? statusStyles.new
  const placementStyle = placementStyles[student.placement?.code ?? 'cold'] ?? placementStyles.cold

  // Format date helper
  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "—"
    try {
      return new Date(dateStr).toLocaleDateString("en-GB", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    } catch {
      return dateStr
    }
  }

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href="/">Dashboard</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink href="/students">Students</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>{student.first_name} {student.surname}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      {/* Header */}
      <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex items-start gap-4">
          <Button variant="ghost" size="icon" asChild className="mt-1">
            <Link href="/students">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <Avatar className="h-16 w-16 border-4 border-background shadow-lg">
            <AvatarFallback className="bg-gradient-to-br from-primary/30 to-primary/10 text-primary text-xl font-semibold">
              {student.first_name?.[0] ?? ''}{student.surname?.[0] ?? ''}
            </AvatarFallback>
          </Avatar>
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl font-semibold tracking-tight">
                {student.first_name} {student.surname}
              </h1>
              {student.status && (
                <Badge variant="outline" className={`${statusStyle} border font-medium`}>
                  {student.status.label}
                </Badge>
              )}
              {student.placement && (
                <Badge className={`${placementStyle.color} border-0 font-medium`}>
                  {placementStyle.label}
                </Badge>
              )}
            </div>
            {student.chinese_name && (
              <p className="text-lg text-muted-foreground mt-0.5">{student.chinese_name}</p>
            )}
            <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground flex-wrap">
              <code className="font-mono bg-muted px-2 py-0.5 rounded text-xs">
                {student.student_code ?? '—'}
              </code>
              {student.nationality && (
                <>
                  <span>&middot;</span>
                  <span>{student.nationality.label}</span>
                </>
              )}
              {student.gender && (
                <>
                  <span>&middot;</span>
                  <span>{student.gender === "M" ? "Male" : student.gender === "F" ? "Female" : student.gender}</span>
                </>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Button className="gap-2 shadow-sm" asChild>
            <Link href={`/students/${id}/edit`}>
              <Edit className="h-4 w-4" />
              Edit Student
            </Link>
          </Button>
          <DeleteStudentDialog
            studentId={id}
            studentName={`${student.first_name} ${student.surname}`}
          />
        </div>
      </div>

      {/* Main Content - Overview */}
      <div className="space-y-6">
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Personal Information */}
          <Card className="lg:col-span-2 border-0 shadow-sm">
            <CardHeader className="pb-4">
              <CardTitle className="text-base font-medium flex items-center gap-2">
                <User className="h-4 w-4 text-muted-foreground" />
                Personal Information
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Full Name</p>
                <p className="text-sm font-medium">{student.first_name} {student.surname}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Chinese Name</p>
                <p className="text-sm font-medium">{student.chinese_name || "—"}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Date of Birth</p>
                <p className="text-sm font-medium flex items-center gap-2">
                  <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                  {formatDate(student.date_of_birth)}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Gender</p>
                <p className="text-sm font-medium">
                  {student.gender === "M" ? "Male" : student.gender === "F" ? "Female" : student.gender || "—"}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Nationality</p>
                <p className="text-sm font-medium flex items-center gap-2">
                  <Globe className="h-3.5 w-3.5 text-muted-foreground" />
                  {student.nationality?.label || "—"}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Passport</p>
                <p className="text-sm font-medium">
                  {student.passport_type ? `${student.passport_type} - ${student.passport_number || '—'}` : "—"}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-4">
              <CardTitle className="text-base font-medium">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {student.email && (
                <Button variant="outline" className="w-full justify-start gap-2" asChild>
                  <a href={`mailto:${student.email}`}>
                    <Mail className="h-4 w-4" />
                    Send Email
                  </a>
                </Button>
              )}
              <Button variant="outline" className="w-full justify-start gap-2" disabled>
                <Phone className="h-4 w-4" />
                Log Call
              </Button>
              <Button variant="outline" className="w-full justify-start gap-2" disabled>
                <MessageSquare className="h-4 w-4" />
                Add Note
              </Button>
              <Button variant="outline" className="w-full justify-start gap-2" asChild>
                <a href="#applications">
                  <School className="h-4 w-4" />
                  New Application
                </a>
              </Button>
              <Button variant="outline" className="w-full justify-start gap-2" asChild>
                <a href="#education">
                  <BookOpen className="h-4 w-4" />
                  New Education
                </a>
              </Button>
              <Button variant="outline" className="w-full justify-start gap-2" asChild>
                <a href="#visas">
                  <Shield className="h-4 w-4" />
                  New Visa
                </a>
              </Button>
              <Button variant="outline" className="w-full justify-start gap-2" asChild>
                <a href="#event-applications">
                  <CalendarDays className="h-4 w-4" />
                  New Event App
                </a>
              </Button>
              <Button variant="outline" className="w-full justify-start gap-2" asChild>
                <a href="#travel">
                  <Plane className="h-4 w-4" />
                  New Travel
                </a>
              </Button>
              <Button variant="outline" className="w-full justify-start gap-2" asChild>
                <a href="#exam-results">
                  <FileCheck className="h-4 w-4" />
                  New Exam Result
                </a>
              </Button>
              <Button variant="outline" className="w-full justify-start gap-2" asChild>
                <a href="#resume">
                  <FileText className="h-4 w-4" />
                  New Resume
                </a>
              </Button>
              <Button variant="outline" className="w-full justify-start gap-2" asChild>
                <a href="#log-book">
                  <BookOpen className="h-4 w-4" />
                  New Log Entry
                </a>
              </Button>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Contact Information */}
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-4">
              <CardTitle className="text-base font-medium flex items-center gap-2">
                <Phone className="h-4 w-4 text-muted-foreground" />
                Contact Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Email</p>
                <p className="text-sm font-medium flex items-center gap-2">
                  <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                  {student.email || "—"}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Mobile</p>
                <p className="text-sm font-medium flex items-center gap-2">
                  <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                  {student.mobile || "—"}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Telephone</p>
                <p className="text-sm font-medium">{student.telephone || "—"}</p>
              </div>
              <Separator />
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Address Line 1</p>
                <p className="text-sm font-medium flex items-start gap-2">
                  <MapPin className="h-3.5 w-3.5 text-muted-foreground mt-0.5" />
                  {student.address_line_1 || "—"}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Address Line 2</p>
                <p className="text-sm font-medium flex items-start gap-2">
                  <MapPin className="h-3.5 w-3.5 text-muted-foreground mt-0.5" />
                  {student.address_line_2 || "—"}
                </p>
              </div>
              {student.chinese_address && (
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Chinese Address</p>
                  <p className="text-sm font-medium">{student.chinese_address}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Academic Information */}
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-4">
              <CardTitle className="text-base font-medium flex items-center gap-2">
                <GraduationCap className="h-4 w-4 text-muted-foreground" />
                Academic Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Current School</p>
                <p className="text-sm font-medium">{student.present_school || "—"}</p>
                {student.school_type && (
                  <p className="text-xs text-muted-foreground">{student.school_type.label}</p>
                )}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Course</p>
                  <p className="text-sm font-medium">{student.course?.label || "—"}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Entry Year</p>
                  <p className="text-sm font-medium">{student.entry_year?.slice(0, 4) || "—"}</p>
                </div>
              </div>
              <Separator />
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Enrollment Date</p>
                <p className="text-sm font-medium">{formatDate(student.enrollment_date)}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Lead Source</p>
                <p className="text-sm font-medium">{student.lead_source?.label || "—"}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Exam Paper</p>
                <p className="text-sm font-medium">{student.exam_paper || "—"}</p>
              </div>
              <div className="flex gap-4 pt-2">
                <Badge variant={student.aa_news ? "default" : "secondary"} className="text-xs">
                  {student.aa_news ? "AA News: Yes" : "AA News: No"}
                </Badge>
                <Badge variant={student.airport_pickup ? "default" : "secondary"} className="text-xs">
                  {student.airport_pickup ? "Airport Pickup: Yes" : "Airport Pickup: No"}
                </Badge>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Brief Introduction */}
        <div id="brief-intro">
          <StudentBriefIntroSection
            studentId={id}
            briefIntro={briefIntro}
            referenceData={briefIntroReferenceData}
          />
        </div>

        {/* Remarks */}
        {student.remarks && (
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-4">
              <CardTitle className="text-base font-medium flex items-center gap-2">
                <ClipboardList className="h-4 w-4 text-muted-foreground" />
                Remarks
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">{student.remarks}</p>
            </CardContent>
          </Card>
        )}

        {/* School Applications Section */}
        <div id="applications">
          <StudentApplicationsSection
            studentId={id}
            applications={applications}
            referenceData={appReferenceData}
          />
        </div>

        {/* Education Section */}
        <div id="education">
          <StudentEducationSection
            studentId={id}
            educationEntries={educationEntries}
            referenceData={eduReferenceData}
          />
        </div>

        {/* Resume Section */}
        <div id="resume">
          <StudentResumeSection
            studentId={id}
            resumeEntries={resumeEntries}
            referenceData={resumeReferenceData}
          />
        </div>

        {/* Visa Section */}
        <div id="visas">
          <StudentVisasSection
            studentId={id}
            visas={visas}
            referenceData={visaReferenceData}
          />
        </div>

        {/* Event Applications Section */}
        <div id="event-applications">
          <StudentEventApplicationsSection
            studentId={id}
            applications={eventApplications}
            referenceData={eventAppReferenceData}
          />
        </div>

        {/* Travel Section */}
        <div id="travel">
          <StudentTravelSection
            studentId={id}
            travelRecords={travelRecords}
            referenceData={travelReferenceData}
          />
        </div>

        {/* Exam Results Section */}
        <div id="exam-results">
          <StudentExamResultsSection
            studentId={id}
            examResults={examResults}
            referenceData={examResultReferenceData}
          />
        </div>

        {/* Log Book Section */}
        <div id="log-book">
          <StudentLogBookSection
            studentId={id}
            logEntries={logEntries}
          />
        </div>

        {/* Contacts Section */}
        <StudentContactsSection
          studentId={id}
          contacts={contacts}
          referenceData={contactReferenceData}
        />
      </div>
    </div>
  )
}
