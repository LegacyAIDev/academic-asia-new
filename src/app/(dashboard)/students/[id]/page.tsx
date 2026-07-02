import Link from "next/link"
import { notFound } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
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
  Files,
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
import { getStudentResume, getResumeReferenceData } from "@/lib/supabase/queries/student-resume"
import { getStudentResumeProfile, getStudentResumeTalents, getStudentDocuments } from "@/lib/supabase/queries/student-resume-profile"
import { getStudentAATests } from "@/lib/supabase/queries/student-individual-exams"
import { getStudentInternalNotes } from "@/lib/supabase/queries/student-internal-notes"
import { StudentContactsSection } from "./student-contacts"
import { StudentApplicationsSection } from "./student-applications"
import { StudentEducationSection } from "./student-education"
import { StudentVisasSection } from "./student-visas"
import { StudentEventApplicationsSection } from "./student-event-applications"
import { StudentTravelSection } from "./student-travel"
import { StudentExamResultsSection } from "./student-exam-results"
import { StudentBriefIntroSection } from "./student-brief-intro"
import { StudentResumeProfileSection } from "./student-resume-profile"
import { StudentResumeSection } from "./student-resume"
import { StudentInternalNotesSection } from "./student-internal-notes"
import { StudentLegalDocumentsSection } from "./student-legal-documents"
import { StudentDocumentsSection } from "./student-documents-section"
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

type StudentDetailPageParams = {
  params: Promise<{ id: string }>
  searchParams: Promise<{ tab?: string }>
}

export default async function StudentDetailPage({ params, searchParams }: StudentDetailPageParams) {
  const { id } = await params
  const { tab: rawTab } = await searchParams
  // Normalise the tab param, mapping the legacy "profile" value to "overview"
  const validTabs = ["overview", "resume", "contacts", "education", "documents", "applications", "events", "immigration"]
  const tab = validTabs.includes(rawTab ?? "") ? (rawTab as string) : "overview"

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
    resumeEntries, resumeReferenceData,
    internalNotes,
    resumeProfile, resumeTalents, resumeDocuments, aaTests, legalDocuments,
    allDocuments,
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
    getStudentResume(id),
    getResumeReferenceData(),
    getStudentInternalNotes(id),
    getStudentResumeProfile(id),
    getStudentResumeTalents(id),
    getStudentDocuments(id, 'resume'),
    getStudentAATests(id),
    getStudentDocuments(id, 'legal_documents'),
    getStudentDocuments(id),
  ])

  if (!student) {
    notFound()
  }

  const statusStyle = statusStyles[student.status?.code ?? 'new'] ?? statusStyles.new
  const placementStyle = placementStyles[student.placement?.code ?? 'cold'] ?? placementStyles.cold

  // AA mainly emails parents/guardians. Pick the highest-priority contact that
  // has an email so the header offers a one-click "Email Parent" action.
  const parentContact = [...contacts]
    .filter((c) => c.email_1 || c.email_2 || c.email_3)
    .sort((a, b) => (a.priority ?? 99) - (b.priority ?? 99))[0]
  const parentEmail = parentContact?.email_1 || parentContact?.email_2 || parentContact?.email_3
  const parentName = parentContact
    ? [parentContact.first_name, parentContact.surname].filter(Boolean).join(' ')
    : ''

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
              {student.date_of_birth && (
                <>
                  <span>&middot;</span>
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3.5 w-3.5" />
                    {formatDate(student.date_of_birth)}
                  </span>
                </>
              )}
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
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Consultant</p>
                <p className="text-sm font-medium">
                  {student.assigned_profile
                    ? [student.assigned_profile.first_name, student.assigned_profile.surname].filter(Boolean).join(" ")
                    : "—"}
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
              {parentEmail && (
                <Button className="w-full justify-start gap-2 shadow-sm" asChild>
                  <a href={`mailto:${parentEmail}`} title={`${parentEmail}${parentName ? ` — ${parentName}` : ''}`}>
                    <Mail className="h-4 w-4" />
                    Email Parent{parentName ? ` (${parentName})` : ''}
                  </a>
                </Button>
              )}
              {student.email && (
                <Button variant="outline" className="w-full justify-start gap-2" asChild>
                  <a href={`mailto:${student.email}`}>
                    <Mail className="h-4 w-4" />
                    Email Student
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
                <Link href={`/students/${id}?tab=applications`} scroll={false}>
                  <School className="h-4 w-4" />
                  New Application
                </Link>
              </Button>
              <Button variant="outline" className="w-full justify-start gap-2" asChild>
                <Link href={`/students/${id}?tab=education`} scroll={false}>
                  <BookOpen className="h-4 w-4" />
                  New Education
                </Link>
              </Button>
              <Button variant="outline" className="w-full justify-start gap-2" asChild>
                <Link href={`/students/${id}?tab=immigration`} scroll={false}>
                  <Shield className="h-4 w-4" />
                  New Visa
                </Link>
              </Button>
              <Button variant="outline" className="w-full justify-start gap-2" asChild>
                <Link href={`/students/${id}?tab=events`} scroll={false}>
                  <CalendarDays className="h-4 w-4" />
                  New Event App
                </Link>
              </Button>
              <Button variant="outline" className="w-full justify-start gap-2" asChild>
                <Link href={`/students/${id}?tab=immigration`} scroll={false}>
                  <Plane className="h-4 w-4" />
                  New Travel
                </Link>
              </Button>
              <Button variant="outline" className="w-full justify-start gap-2" asChild>
                <Link href={`/students/${id}?tab=education`} scroll={false}>
                  <FileCheck className="h-4 w-4" />
                  New Exam Result
                </Link>
              </Button>
              <Button variant="outline" className="w-full justify-start gap-2" asChild>
                <Link href={`/students/${id}?tab=resume`} scroll={false}>
                  <FileText className="h-4 w-4" />
                  New Resume
                </Link>
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
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Entry</p>
                  <p className="text-sm font-medium">{student.entry_year ? `${["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"][(student.entry_month ?? 1) - 1]} ${student.entry_year}` : "—"}</p>
                </div>
              </div>
              <Separator />
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Enrollment Date</p>
                <p className="text-sm font-medium">{formatDate(student.enrollment_date)}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Lead Source</p>
                <p className="text-sm font-medium capitalize">
                  {student.lead_source_category
                    ? `${student.lead_source_category.replace("_", " ")}${student.lead_source_referral_detail ? ` — ${student.lead_source_referral_detail}` : ""}${student.lead_source_event ? ` — ${student.lead_source_event.name}` : ""}`
                    : "—"}
                </p>
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

        {/* Tabs — sections grouped to avoid one long scrolling page */}
        <Tabs defaultValue={tab} className="space-y-6">
          <div className="overflow-x-auto pb-1">
            <TabsList className="bg-muted/50 w-max">
              <TabsTrigger value="overview" asChild>
                <Link href={`/students/${id}?tab=overview`} scroll={false} className="gap-1.5">
                  <User className="h-4 w-4" />
                  Overview
                </Link>
              </TabsTrigger>
              <TabsTrigger value="resume" asChild>
                <Link href={`/students/${id}?tab=resume`} scroll={false} className="gap-1.5">
                  <FileText className="h-4 w-4" />
                  Resume
                </Link>
              </TabsTrigger>
              <TabsTrigger value="contacts" asChild>
                <Link href={`/students/${id}?tab=contacts`} scroll={false} className="gap-1.5">
                  <Phone className="h-4 w-4" />
                  Contacts
                </Link>
              </TabsTrigger>
              <TabsTrigger value="education" asChild>
                <Link href={`/students/${id}?tab=education`} scroll={false} className="gap-1.5">
                  <GraduationCap className="h-4 w-4" />
                  Education
                </Link>
              </TabsTrigger>
              <TabsTrigger value="documents" asChild>
                <Link href={`/students/${id}?tab=documents`} scroll={false} className="gap-1.5">
                  <Files className="h-4 w-4" />
                  Documents
                </Link>
              </TabsTrigger>
              <TabsTrigger value="applications" asChild>
                <Link href={`/students/${id}?tab=applications`} scroll={false} className="gap-1.5">
                  <School className="h-4 w-4" />
                  School Applications
                </Link>
              </TabsTrigger>
              <TabsTrigger value="events" asChild>
                <Link href={`/students/${id}?tab=events`} scroll={false} className="gap-1.5">
                  <CalendarDays className="h-4 w-4" />
                  Event Applications
                </Link>
              </TabsTrigger>
              <TabsTrigger value="immigration" asChild>
                <Link href={`/students/${id}?tab=immigration`} scroll={false} className="gap-1.5">
                  <Plane className="h-4 w-4" />
                  Immigration
                </Link>
              </TabsTrigger>
            </TabsList>
          </div>

          {/* Overview: brief intro, notes and remarks */}
          <TabsContent value="overview" className="space-y-6">
            <StudentBriefIntroSection
              studentId={id}
              briefIntro={briefIntro}
              referenceData={briefIntroReferenceData}
            />

            <StudentInternalNotesSection
              studentId={id}
              notes={internalNotes}
            />

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
          </TabsContent>

          {/* Resume: profile (talents/interests) + Music Audition / Top Schools records */}
          <TabsContent value="resume" className="space-y-6">
            <StudentResumeProfileSection
              studentId={id}
              profile={resumeProfile}
              talents={resumeTalents}
              documents={resumeDocuments}
              aaTests={aaTests}
            />

            <StudentResumeSection
              studentId={id}
              resumeEntries={resumeEntries}
              referenceData={resumeReferenceData}
            />
          </TabsContent>

          {/* Contacts: family / next-of-kin */}
          <TabsContent value="contacts" className="space-y-6">
            <StudentContactsSection
              studentId={id}
              contacts={contacts}
              referenceData={contactReferenceData}
              studentAddress={student.address_line_1}
            />
          </TabsContent>

          {/* Education: schooling history and exam results */}
          <TabsContent value="education" className="space-y-6">
            <StudentEducationSection
              studentId={id}
              educationEntries={educationEntries}
              referenceData={eduReferenceData}
            />

            <StudentExamResultsSection
              studentId={id}
              examResults={examResults}
              referenceData={examResultReferenceData}
            />
          </TabsContent>

          {/* Documents: multi-file upload with categories and rename */}
          <TabsContent value="documents" className="space-y-6">
            <StudentDocumentsSection studentId={id} documents={allDocuments} />
          </TabsContent>

          {/* School Applications */}
          <TabsContent value="applications" className="space-y-6">
            <StudentApplicationsSection
              studentId={id}
              applications={applications}
              referenceData={appReferenceData}
            />
          </TabsContent>

          {/* Event Applications */}
          <TabsContent value="events" className="space-y-6">
            <StudentEventApplicationsSection
              studentId={id}
              applications={eventApplications}
              referenceData={eventAppReferenceData}
            />
          </TabsContent>

          {/* Immigration: visas, legal documents and travel */}
          <TabsContent value="immigration" className="space-y-6">
            <StudentVisasSection
              studentId={id}
              visas={visas}
              referenceData={visaReferenceData}
            />

            <StudentLegalDocumentsSection
              studentId={id}
              passportType={student.passport_type}
              passportNumber={student.passport_number}
              documents={legalDocuments}
            />

            <StudentTravelSection
              studentId={id}
              travelRecords={travelRecords}
              referenceData={travelReferenceData}
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
