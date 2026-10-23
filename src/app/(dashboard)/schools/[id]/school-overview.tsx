import { Building2, ClipboardList, FileText, Tags } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { SchoolWithJoins } from "@/lib/supabase/queries/schools"
import { getSchoolPlacementHistory } from "@/lib/supabase/queries/school-placement-history"
import { SchoolPlacementHistory } from "./school-placement-history"
import { currentAcademicYearStart, defaultPlacementYear } from "@/lib/schools/placement-history"

function Fact({ label, children, wide }: { label: string; children: React.ReactNode; wide?: boolean }) {
  return (
    <div className={wide ? "space-y-1 sm:col-span-2" : "space-y-1"}>
      <dt className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</dt>
      <dd className="break-words text-sm font-medium">{children || "—"}</dd>
    </div>
  )
}

const YesNo = ({ value }: { value: boolean | null }) =>
  value ? <Badge className="border-0 bg-emerald-50 text-emerald-700">Yes</Badge> : <Badge variant="secondary">No</Badge>

const linkClass = "text-primary underline-offset-2 hover:underline"

function websiteHref(website: string) {
  return /^https?:\/\//i.test(website) ? website : `https://${website}`
}

function CardBlock({ icon: Icon, title, children }: { icon: React.ElementType; title: string; children: React.ReactNode }) {
  return (
    <Card className="border-0 shadow-sm">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-base font-medium">
          <Icon className="h-4 w-4 text-muted-foreground" /> {title}
        </CardTitle>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  )
}

/**
 * First tab of the school page: what staff need at a glance, in two cards
 * (the school itself, and admissions), then remarks, keywords and placement
 * history. Each contact detail appears once.
 */
export async function SchoolOverview({ school }: { school: SchoolWithJoins }) {
  const placementHistory = await getSchoolPlacementHistory(school.id)
  const defaultPlacementYearKey = defaultPlacementYear(placementHistory ?? [], currentAcademicYearStart())
  const address = [school.address, [school.city, school.county].filter(Boolean).join(", "), school.postcode, school.country?.label]
    .filter(Boolean)
  const boarders = school.boarder_count != null
    ? `${school.boarder_count.toLocaleString("en-GB")}${school.boarder_age_min != null || school.boarder_age_max != null
      ? ` (ages ${school.boarder_age_min ?? "?"}–${school.boarder_age_max ?? "?"})` : ""}`
    : null
  const gender = school.gender_type?.label
    ? `${school.gender_type.label}${school.coed_from?.label ? ` · co-ed from ${school.coed_from.label}` : ""}`
    : null

  return (
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-5">
        <div className="lg:col-span-3">
          <CardBlock icon={Building2} title="School details">
            <dl className="grid gap-4 sm:grid-cols-2">
              <Fact label="Institution type">{school.institution_type?.label}</Fact>
              <Fact label="Gender">{gender}</Fact>
              <Fact label="Phase">{school.phase?.label}</Fact>
              <Fact label="Religious affiliation">{school.religious_affiliation?.label}</Fact>
              <Fact label="Pupils">{school.pupil_count?.toLocaleString("en-GB")}</Fact>
              <Fact label="Boarders">{boarders}</Fact>
              <Fact label="Address" wide>
                {address.length > 0 && <span className="whitespace-pre-line">{address.join("\n")}</span>}
              </Fact>
              <Fact label="Website">
                {school.website && <a href={websiteHref(school.website)} target="_blank" rel="noopener noreferrer" className={linkClass}>{school.website}</a>}
              </Fact>
              <Fact label="Email">
                {school.email && <a href={`mailto:${school.email}`} className={linkClass}>{school.email}</a>}
              </Fact>
              <Fact label="Telephone">
                {school.telephone && <a href={`tel:${school.telephone}`} className={linkClass}>{school.telephone}</a>}
              </Fact>
              {school.fax && <Fact label="Fax">{school.fax}</Fact>}
            </dl>
          </CardBlock>
        </div>

        <div className="lg:col-span-2">
          <CardBlock icon={ClipboardList} title="Admissions">
            <dl className="grid grid-cols-2 gap-4">
              <Fact label="Accepting applications"><YesNo value={school.accepts_applications} /></Fact>
              <Fact label="Status"><span className="capitalize">{school.status || "normal"}</span></Fact>
              <Fact label="Child visa">
                <span className="flex items-center gap-2">
                  <YesNo value={school.accepts_child_visa} />
                  {school.accepts_child_visa && school.child_visa_age != null && (
                    <span className="text-xs text-muted-foreground">from age {school.child_visa_age}</span>
                  )}
                </span>
              </Fact>
              <Fact label="General visa"><YesNo value={school.accepts_general_visa} /></Fact>
              <Fact label="Current course fee" wide>
                {school.current_course_fee != null && (
                  <span className="tabular-nums">
                    £{Number(school.current_course_fee).toLocaleString("en-GB", { maximumFractionDigits: 0 })}
                    {school.current_course_fee_year && <span className="text-muted-foreground"> · {school.current_course_fee_year}</span>}
                  </span>
                )}
              </Fact>
            </dl>
          </CardBlock>
        </div>
      </div>

      {school.remarks && (
        <CardBlock icon={FileText} title="Remarks">
          <p className="whitespace-pre-wrap text-sm text-muted-foreground">{school.remarks}</p>
        </CardBlock>
      )}

      {school.keywords && (
        <CardBlock icon={Tags} title="Keywords">
          <div className="flex flex-wrap gap-2">
            {school.keywords.split(",").map(k => k.trim()).filter(Boolean).map((keyword, index) => (
              <Badge key={`${keyword}-${index}`} variant="outline" className="text-xs">{keyword}</Badge>
            ))}
          </div>
        </CardBlock>
      )}

      <SchoolPlacementHistory counts={placementHistory} defaultYear={defaultPlacementYearKey} />
    </div>
  )
}
