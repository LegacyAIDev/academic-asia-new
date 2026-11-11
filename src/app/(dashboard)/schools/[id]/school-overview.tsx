import { Badge } from "@/components/ui/badge"
import { Panel } from "@/components/ui/panel"
import { EditSchoolSheet } from "../school-form-sheet"
import type { SchoolWithJoins } from "@/lib/supabase/queries/schools"
import { getSchoolPlacementHistory } from "@/lib/supabase/queries/school-placement-history"
import { SchoolPlacementHistory } from "./school-placement-history"
import { currentAcademicYearStart, defaultPlacementYear } from "@/lib/schools/placement-history"

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[9rem_minmax(0,1fr)] gap-3 py-2 text-sm">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="min-w-0 break-words">{children || <span className="text-muted-foreground/60">Not recorded</span>}</dd>
    </div>
  )
}

const YesNo = ({ value }: { value: boolean | null }) =>
  value ? <span className="font-medium text-emerald-700">Yes</span> : <span className="text-muted-foreground">No</span>

const linkClass = "text-brand-navy underline-offset-2 hover:underline"

function websiteHref(website: string) {
  return /^https?:\/\//i.test(website) ? website : `https://${website}`
}

/**
 * First tab of the school page: the school's details and admissions at a
 * glance, a prompt naming what is still missing, then remarks, keywords and
 * placement history. A zero pupil count counts as not recorded.
 */
export async function SchoolOverview({ school, canWrite }: { school: SchoolWithJoins; canWrite: boolean }) {
  const placementHistory = await getSchoolPlacementHistory(school.id)
  const defaultPlacementYearKey = defaultPlacementYear(placementHistory ?? [], currentAcademicYearStart())
  const address = [school.address, [school.city, school.county].filter(Boolean).join(", "), school.postcode, school.country?.label].filter(Boolean)
  const boarders = school.boarder_count
    ? `${school.boarder_count.toLocaleString("en-GB")}${school.boarder_age_min != null || school.boarder_age_max != null
      ? ` (ages ${school.boarder_age_min ?? "?"} to ${school.boarder_age_max ?? "?"})` : ""}`
    : null
  const gender = school.gender_type?.label
    ? `${school.gender_type.label}${school.coed_from?.label ? `, co-ed from ${school.coed_from.label}` : ""}`
    : null

  const missing = [
    !school.institution_type && "type",
    !school.gender_type && "gender",
    !school.phase && "phase",
    address.length === 0 && "address",
    !school.website && "website",
    !school.email && "email",
    !school.telephone && "telephone",
    !school.pupil_count && "pupil numbers",
  ].filter(Boolean) as string[]

  return (
    <div className="space-y-6">
      {canWrite && missing.length >= 3 && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border-l-2 border-brand-gold bg-brand-gold/10 px-4 py-3">
          <p className="text-sm">
            <span className="font-medium">Complete the profile: </span>
            {missing.join(", ")} {missing.length === 1 ? "is" : "are"} not recorded yet.
          </p>
          <EditSchoolSheet schoolId={school.id} schoolName={school.name} />
        </div>
      )}

      <div className="grid items-start gap-6 lg:grid-cols-5">
        <Panel title="School details" className="lg:col-span-3">
          <dl className="-my-2 divide-y">
            <Row label="Type">{school.institution_type?.label}</Row>
            <Row label="Gender">{gender}</Row>
            <Row label="Phase">{school.phase?.label}</Row>
            <Row label="Religion">{school.religious_affiliation?.label}</Row>
            <Row label="Pupils">{school.pupil_count ? school.pupil_count.toLocaleString("en-GB") : null}</Row>
            <Row label="Boarders">{boarders}</Row>
            <Row label="Address">{address.length > 0 && <span className="whitespace-pre-line">{address.join("\n")}</span>}</Row>
            <Row label="Website">
              {school.website && <a href={websiteHref(school.website)} target="_blank" rel="noopener noreferrer" className={linkClass}>{school.website}</a>}
            </Row>
            <Row label="Email">{school.email && <a href={`mailto:${school.email}`} className={linkClass}>{school.email}</a>}</Row>
            <Row label="Telephone">{school.telephone && <a href={`tel:${school.telephone}`} className={linkClass}>{school.telephone}</a>}</Row>
            {school.fax && <Row label="Fax">{school.fax}</Row>}
          </dl>
        </Panel>

        <Panel title="Admissions" className="lg:col-span-2">
          <dl className="-my-2 divide-y">
            <Row label="Accepting applications"><YesNo value={school.accepts_applications} /></Row>
            <Row label="Status"><span className="capitalize">{school.status || "normal"}</span></Row>
            <Row label="Child visa">
              <YesNo value={school.accepts_child_visa} />
              {school.accepts_child_visa && school.child_visa_age != null && <span className="text-muted-foreground">, from age {school.child_visa_age}</span>}
            </Row>
            <Row label="General visa"><YesNo value={school.accepts_general_visa} /></Row>
            <Row label="Current course fee">
              {school.current_course_fee != null && (
                <span className="tabular-nums">
                  £{Number(school.current_course_fee).toLocaleString("en-GB", { maximumFractionDigits: 0 })}
                  {school.current_course_fee_year && <span className="text-muted-foreground">, {school.current_course_fee_year}</span>}
                </span>
              )}
            </Row>
          </dl>
        </Panel>
      </div>

      {school.remarks && (
        <Panel title="Remarks">
          <p className="whitespace-pre-wrap text-sm text-muted-foreground">{school.remarks}</p>
        </Panel>
      )}

      {school.keywords && (
        <Panel title="Keywords">
          <div className="flex flex-wrap gap-2">
            {school.keywords.split(",").map(k => k.trim()).filter(Boolean).map((keyword, index) => (
              <Badge key={`${keyword}-${index}`} variant="outline" className="text-xs">{keyword}</Badge>
            ))}
          </div>
        </Panel>
      )}

      <SchoolPlacementHistory counts={placementHistory} defaultYear={defaultPlacementYearKey} />
    </div>
  )
}
