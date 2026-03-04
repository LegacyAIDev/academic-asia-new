import Link from "next/link"
import { notFound } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
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
  Globe,
  Users,
  GraduationCap,
  Building2,
  FileText,
  ExternalLink,
  CheckCircle,
  XCircle,
  Info,
  Calendar,
  Banknote,
  ClipboardCheck,
  Trophy,
  StickyNote,
} from "lucide-react"
import { getSchoolById } from "@/lib/supabase/queries/schools"
import {
  getSchoolSupplementaryInfo,
  getDistinctInfoTypes,
  getSchoolSupInfoCount,
} from "@/lib/supabase/queries/school-supplementary-info"
import { getSchoolFees, getFeeReferenceData, getSchoolFeeCount } from "@/lib/supabase/queries/school-fees"
import { getSchoolEntranceExams, getEntranceExamReferenceData, getSchoolEntranceExamCount } from "@/lib/supabase/queries/school-entrance-exams"
import { getSchoolAcademicResults, getAcademicResultReferenceData, getSchoolAcademicResultCount } from "@/lib/supabase/queries/school-academic-results"
import { getSchoolNotes, getNoteReferenceData, getSchoolNoteCount } from "@/lib/supabase/queries/school-notes"
import { DeleteSchoolDialog } from "./delete-school-dialog"
import { SupInfoDialog, EditSupInfoButton, DeleteSupInfoButton } from "./sup-info-dialog"
import { SchoolFeesSection } from "./school-fees"
import { SchoolEntranceExamsSection } from "./school-entrance-exams"
import { SchoolAcademicResultsSection } from "./school-academic-results"
import { SchoolNotesSection } from "./school-notes"

type SchoolDetailPageParams = {
  params: Promise<{ id: string }>
  searchParams: Promise<{ tab?: string; supPage?: string }>
}

export default async function SchoolDetailPage({ params, searchParams }: SchoolDetailPageParams) {
  const { id } = await params
  const { tab = "basic", supPage = "1" } = await searchParams

  const [
    school,
    supInfoResult,
    infoTypes,
    supInfoCount,
    fees,
    feeRefData,
    feeCount,
    entranceExams,
    entranceExamRefData,
    entranceExamCount,
    academicResults,
    academicResultRefData,
    academicResultCount,
    notes,
    noteRefData,
    noteCount,
  ] = await Promise.all([
    getSchoolById(id),
    getSchoolSupplementaryInfo({ schoolId: id, page: parseInt(supPage), pageSize: 25 }),
    getDistinctInfoTypes(),
    getSchoolSupInfoCount(id),
    getSchoolFees(id),
    getFeeReferenceData(),
    getSchoolFeeCount(id),
    getSchoolEntranceExams(id),
    getEntranceExamReferenceData(),
    getSchoolEntranceExamCount(id),
    getSchoolAcademicResults(id),
    getAcademicResultReferenceData(),
    getSchoolAcademicResultCount(id),
    getSchoolNotes(id),
    getNoteReferenceData(),
    getSchoolNoteCount(id),
  ])

  if (!school) {
    notFound()
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
            <BreadcrumbLink href="/schools">Schools</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>{school.name}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      {/* Header */}
      <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex items-start gap-4">
          <Button variant="ghost" size="icon" asChild className="mt-1">
            <Link href="/schools">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-gradient-to-br from-primary/30 to-primary/10 text-primary shadow-lg">
            <Building2 className="h-8 w-8" />
          </div>
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl font-semibold tracking-tight">
                {school.name}
              </h1>
              {school.accepts_applications ? (
                <Badge className="bg-emerald-50 text-emerald-700 border-0">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Accepting Applications
                </Badge>
              ) : (
                <Badge variant="secondary">
                  <XCircle className="h-3 w-3 mr-1" />
                  Not Accepting
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground flex-wrap">
              {school.city && <span>{school.city}</span>}
              {school.country && (
                <>
                  <span>&middot;</span>
                  <span>{school.country.label}</span>
                </>
              )}
              {school.gender_type && (
                <>
                  <span>&middot;</span>
                  <span>{school.gender_type.label}</span>
                </>
              )}
              {school.phase && (
                <>
                  <span>&middot;</span>
                  <span>{school.phase.label}</span>
                </>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Button className="gap-2 shadow-sm" asChild>
            <Link href={`/schools/${id}/edit`}>
              <Edit className="h-4 w-4" />
              Edit School
            </Link>
          </Button>
          <DeleteSchoolDialog schoolId={id} schoolName={school.name} />
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue={tab} className="space-y-6">
        <TabsList className="bg-muted/50">
          <TabsTrigger value="basic" className="gap-2" asChild>
            <Link href={`/schools/${id}?tab=basic`}>
              <Building2 className="h-4 w-4" />
              Basic Info
            </Link>
          </TabsTrigger>
          <TabsTrigger value="supplementary" className="gap-2" asChild>
            <Link href={`/schools/${id}?tab=supplementary`}>
              <Info className="h-4 w-4" />
              Supplementary Info
              <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">
                {supInfoCount}
              </Badge>
            </Link>
          </TabsTrigger>
          <TabsTrigger value="fees" className="gap-2" asChild>
            <Link href={`/schools/${id}?tab=fees`}>
              <Banknote className="h-4 w-4" />
              Fees
              <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">
                {feeCount}
              </Badge>
            </Link>
          </TabsTrigger>
          <TabsTrigger value="entrance-exams" className="gap-2" asChild>
            <Link href={`/schools/${id}?tab=entrance-exams`}>
              <ClipboardCheck className="h-4 w-4" />
              Entrance Exams
              <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">
                {entranceExamCount}
              </Badge>
            </Link>
          </TabsTrigger>
          <TabsTrigger value="academic-results" className="gap-2" asChild>
            <Link href={`/schools/${id}?tab=academic-results`}>
              <Trophy className="h-4 w-4" />
              Academic Results
              <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">
                {academicResultCount}
              </Badge>
            </Link>
          </TabsTrigger>
          <TabsTrigger value="notes" className="gap-2" asChild>
            <Link href={`/schools/${id}?tab=notes`}>
              <StickyNote className="h-4 w-4" />
              Notes
              <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">
                {noteCount}
              </Badge>
            </Link>
          </TabsTrigger>
        </TabsList>

        {/* Basic Info Tab */}
        <TabsContent value="basic" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-3">
            {/* School Information */}
            <Card className="lg:col-span-2 border-0 shadow-sm">
              <CardHeader className="pb-4">
                <CardTitle className="text-base font-medium flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                  School Information
                </CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Institution Type</p>
                  <p className="text-sm font-medium">{school.institution_type?.label || "—"}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Gender Type</p>
                  <p className="text-sm font-medium">{school.gender_type?.label || "—"}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Phase</p>
                  <p className="text-sm font-medium">{school.phase?.label || "—"}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Religious Affiliation</p>
                  <p className="text-sm font-medium">{school.religious_affiliation?.label || "—"}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Pupil Count</p>
                  <p className="text-sm font-medium flex items-center gap-2">
                    <Users className="h-3.5 w-3.5 text-muted-foreground" />
                    {school.pupil_count?.toLocaleString() || "—"}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Boarder Count</p>
                  <p className="text-sm font-medium">{school.boarder_count?.toLocaleString() || "—"}</p>
                </div>
                <div className="space-y-1 sm:col-span-2">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Boarding Age Range</p>
                  <p className="text-sm font-medium">{school.boarder_age_range || "—"}</p>
                </div>
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-4">
                <CardTitle className="text-base font-medium">Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {school.website && (
                  <Button variant="outline" className="w-full justify-start gap-2" asChild>
                    <a href={school.website.startsWith('http') ? school.website : `https://${school.website}`} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-4 w-4" />
                      Visit Website
                    </a>
                  </Button>
                )}
                {school.email && (
                  <Button variant="outline" className="w-full justify-start gap-2" asChild>
                    <a href={`mailto:${school.email}`}>
                      <Mail className="h-4 w-4" />
                      Send Email
                    </a>
                  </Button>
                )}
                {school.telephone && (
                  <Button variant="outline" className="w-full justify-start gap-2" asChild>
                    <a href={`tel:${school.telephone}`}>
                      <Phone className="h-4 w-4" />
                      Call School
                    </a>
                  </Button>
                )}
                <Button variant="outline" className="w-full justify-start gap-2" disabled>
                  <GraduationCap className="h-4 w-4" />
                  View Applications
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
                    {school.email || "—"}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Telephone</p>
                  <p className="text-sm font-medium flex items-center gap-2">
                    <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                    {school.telephone || "—"}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Fax</p>
                  <p className="text-sm font-medium">{school.fax || "—"}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Website</p>
                  <p className="text-sm font-medium flex items-center gap-2">
                    <Globe className="h-3.5 w-3.5 text-muted-foreground" />
                    {school.website || "—"}
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Address */}
            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-4">
                <CardTitle className="text-base font-medium flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  Address
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Street Address</p>
                  <p className="text-sm font-medium">{school.address || "—"}</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">City</p>
                    <p className="text-sm font-medium">{school.city || "—"}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">County</p>
                    <p className="text-sm font-medium">{school.county || "—"}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Postcode</p>
                    <p className="text-sm font-medium">{school.postcode || "—"}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Country</p>
                    <p className="text-sm font-medium">{school.country?.label || "—"}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Visa Information */}
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-4">
              <CardTitle className="text-base font-medium flex items-center gap-2">
                <FileText className="h-4 w-4 text-muted-foreground" />
                Visa & Admission Information
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Accepts Child Visa</p>
                  <p className="text-sm font-medium">
                    {school.accepts_child_visa ? (
                      <Badge className="bg-emerald-50 text-emerald-700 border-0">Yes</Badge>
                    ) : (
                      <Badge variant="secondary">No</Badge>
                    )}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Accepts General Visa</p>
                  <p className="text-sm font-medium">
                    {school.accepts_general_visa ? (
                      <Badge className="bg-emerald-50 text-emerald-700 border-0">Yes</Badge>
                    ) : (
                      <Badge variant="secondary">No</Badge>
                    )}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Child Visa Min Age</p>
                  <p className="text-sm font-medium">{school.child_visa_age ?? "—"}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Status</p>
                  <p className="text-sm font-medium capitalize">{school.status || "normal"}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Remarks */}
          {school.remarks && (
            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-4">
                <CardTitle className="text-base font-medium flex items-center gap-2">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  Remarks
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">{school.remarks}</p>
              </CardContent>
            </Card>
          )}

          {/* Keywords */}
          {school.keywords && (
            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-4">
                <CardTitle className="text-base font-medium">Keywords</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {school.keywords.split(',').map((keyword, idx) => (
                    <Badge key={idx} variant="outline" className="text-xs">
                      {keyword.trim()}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Supplementary Info Tab */}
        <TabsContent value="supplementary" className="space-y-6">
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-medium flex items-center gap-2">
                  <Info className="h-4 w-4 text-muted-foreground" />
                  Supplementary Information
                  <Badge variant="secondary" className="ml-2">
                    {supInfoResult.totalCount} records
                  </Badge>
                </CardTitle>
                <SupInfoDialog schoolId={id} mode="create" infoTypes={infoTypes} />
              </div>
            </CardHeader>
            <CardContent>
              {supInfoResult.items.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-muted/50 mb-4">
                    <Info className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <h3 className="text-lg font-medium mb-1">No Supplementary Info</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Add supplementary information for this school.
                  </p>
                  <SupInfoDialog schoolId={id} mode="create" infoTypes={infoTypes} />
                </div>
              ) : (
                <>
                  <div className="rounded-lg border">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/50">
                          <TableHead className="w-[100px]">Year</TableHead>
                          <TableHead className="w-[180px]">Info Type</TableHead>
                          <TableHead>Information</TableHead>
                          <TableHead className="w-[80px] text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {supInfoResult.items.map((item) => (
                          <TableRow key={item.id}>
                            <TableCell className="font-medium">
                              <div className="flex items-center gap-2">
                                <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                                {item.school_year || "—"}
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className="font-normal">
                                {item.info_type}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <p className="text-sm text-muted-foreground line-clamp-2">
                                {item.info || "—"}
                              </p>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center justify-end gap-1">
                                <EditSupInfoButton
                                  supInfo={item}
                                  schoolId={id}
                                  infoTypes={infoTypes}
                                />
                                <DeleteSupInfoButton
                                  supInfoId={item.id}
                                  schoolId={id}
                                  infoType={item.info_type}
                                />
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>

                  {/* Pagination */}
                  {supInfoResult.totalPages > 1 && (
                    <div className="flex items-center justify-between pt-4">
                      <p className="text-sm text-muted-foreground">
                        Page {supInfoResult.page} of {supInfoResult.totalPages}
                      </p>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={supInfoResult.page <= 1}
                          asChild
                        >
                          <Link href={`/schools/${id}?tab=supplementary&supPage=${supInfoResult.page - 1}`}>
                            Previous
                          </Link>
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={supInfoResult.page >= supInfoResult.totalPages}
                          asChild
                        >
                          <Link href={`/schools/${id}?tab=supplementary&supPage=${supInfoResult.page + 1}`}>
                            Next
                          </Link>
                        </Button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Fees Tab */}
        <TabsContent value="fees" className="space-y-6">
          <SchoolFeesSection schoolId={id} fees={fees} referenceData={feeRefData} />
        </TabsContent>

        {/* Entrance Exams Tab */}
        <TabsContent value="entrance-exams" className="space-y-6">
          <SchoolEntranceExamsSection schoolId={id} exams={entranceExams} referenceData={entranceExamRefData} />
        </TabsContent>

        {/* Academic Results Tab */}
        <TabsContent value="academic-results" className="space-y-6">
          <SchoolAcademicResultsSection schoolId={id} results={academicResults} referenceData={academicResultRefData} />
        </TabsContent>

        {/* Notes Tab */}
        <TabsContent value="notes" className="space-y-6">
          <SchoolNotesSection schoolId={id} notes={notes} referenceData={noteRefData} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
