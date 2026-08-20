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
import { PhoneInput } from "@/components/ui/phone-input"
import {
  Save,
  Building2,
  Phone,
  MapPin,
  FileText,
  Loader2,
} from "lucide-react"
import { createSchool, updateSchool, type CreateSchoolInput } from "@/lib/supabase/actions/schools"
import type { SchoolWithJoins } from "@/lib/supabase/queries/schools"

/** Tri-state select <-> nullable boolean. NULL means nobody has answered yet. */
const boolToSelect = (value: boolean | null | undefined) =>
  value === true ? "yes" : value === false ? "no" : "unknown"

const selectToBool = (value: FormDataEntryValue | null): boolean | null =>
  value === "yes" ? true : value === "no" ? false : null

type ReferenceItem = {
  id: number
  code: string
  label: string
}

export type SchoolFormProps = {
  mode: "create" | "edit"
  school?: SchoolWithJoins | null
  referenceData: {
    countries: ReferenceItem[]
    genderTypes: ReferenceItem[]
    institutionTypes: ReferenceItem[]
    phases: ReferenceItem[]
    religiousAffiliations: ReferenceItem[]
    coedFromOptions: ReferenceItem[]
  }
}

export function SchoolForm({ mode, school, referenceData }: SchoolFormProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [genderTypeId, setGenderTypeId] = useState(school?.gender_type?.id?.toString() ?? "")

  const { countries, genderTypes, institutionTypes, phases, religiousAffiliations, coedFromOptions } = referenceData

  const selectedGenderCode = genderTypes.find(g => g.id.toString() === genderTypeId)?.code
  const showCoedFrom = selectedGenderCode === "boys" || selectedGenderCode === "girls"

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)

    const formData = new FormData(e.currentTarget)

    const input: CreateSchoolInput = {
      name: formData.get("name") as string,
      address: (formData.get("address") as string) || null,
      city: (formData.get("city") as string) || null,
      county: (formData.get("county") as string) || null,
      postcode: (formData.get("postcode") as string) || null,
      country_id: formData.get("country_id") ? parseInt(formData.get("country_id") as string, 10) : null,
      telephone: (formData.get("telephone") as string) || null,
      fax: (formData.get("fax") as string) || null,
      email: (formData.get("email") as string) || null,
      website: (formData.get("website") as string) || null,
      gender_type_id: formData.get("gender_type_id") ? parseInt(formData.get("gender_type_id") as string, 10) : null,
      institution_type_id: formData.get("institution_type_id") ? parseInt(formData.get("institution_type_id") as string, 10) : null,
      phase_id: formData.get("phase_id") ? parseInt(formData.get("phase_id") as string, 10) : null,
      religious_affiliation_id: formData.get("religious_affiliation_id") ? parseInt(formData.get("religious_affiliation_id") as string, 10) : null,
      coed_from_id: formData.get("coed_from_id") ? parseInt(formData.get("coed_from_id") as string, 10) : null,
      pupil_count: formData.get("pupil_count") ? parseInt(formData.get("pupil_count") as string, 10) : null,
      boarder_count: formData.get("boarder_count") ? parseInt(formData.get("boarder_count") as string, 10) : null,
      boarder_age_min: formData.get("boarder_age_min") ? parseInt(formData.get("boarder_age_min") as string, 10) : null,
      boarder_age_max: formData.get("boarder_age_max") ? parseInt(formData.get("boarder_age_max") as string, 10) : null,
      school_age_min: formData.get("school_age_min") ? parseInt(formData.get("school_age_min") as string, 10) : null,
      school_age_max: formData.get("school_age_max") ? parseInt(formData.get("school_age_max") as string, 10) : null,
      offers_a_level: selectToBool(formData.get("offers_a_level")),
      offers_ib: selectToBool(formData.get("offers_ib")),
      child_visa_age: formData.get("child_visa_age") ? parseInt(formData.get("child_visa_age") as string, 10) : null,
      accepts_child_visa: formData.get("accepts_child_visa") === "on",
      accepts_general_visa: formData.get("accepts_general_visa") === "on",
      accepts_applications: formData.get("accepts_applications") === "on",
      keywords: (formData.get("keywords") as string) || null,
      remarks: (formData.get("remarks") as string) || null,
    }

    startTransition(async () => {
      let result
      if (mode === "create") {
        result = await createSchool(input)
      } else if (school?.id) {
        result = await updateSchool(school.id, input)
      }

      if (result?.success) {
        if (mode === "create" && result.data?.id) {
          router.push(`/schools/${result.data.id}`)
        } else if (school?.id) {
          router.push(`/schools/${school.id}`)
        } else {
          router.push("/schools")
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

      {/* Basic Information */}
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="text-base font-medium flex items-center gap-2">
            <Building2 className="h-4 w-4 text-muted-foreground" />
            Basic Information
          </CardTitle>
          <CardDescription>School name and classification</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="name">
              School Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="name"
              name="name"
              placeholder="e.g. Eton College"
              required
              defaultValue={school?.name ?? ""}
            />
          </div>

          <div className="flex gap-4 items-end">
            <div className="space-y-2 w-48">
              <Label htmlFor="gender_type_id">Gender Type</Label>
              <Select name="gender_type_id" value={genderTypeId} onValueChange={setGenderTypeId}>
                <SelectTrigger id="gender_type_id">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  {genderTypes.map((type) => (
                    <SelectItem key={type.id} value={type.id.toString()}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {showCoedFrom && (
              <div className="space-y-2 w-48">
                <Label htmlFor="coed_from_id">Going Co-ed From</Label>
                <Select name="coed_from_id" defaultValue={school?.coed_from?.id?.toString() ?? ""}>
                  <SelectTrigger id="coed_from_id">
                    <SelectValue placeholder="Select year" />
                  </SelectTrigger>
                  <SelectContent>
                    {coedFromOptions.map((option) => (
                      <SelectItem key={option.id} value={option.id.toString()}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="institution_type_id">Institution Type</Label>
              <Select name="institution_type_id" defaultValue={school?.institution_type?.id?.toString() ?? ""}>
                <SelectTrigger id="institution_type_id">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  {institutionTypes.map((type) => (
                    <SelectItem key={type.id} value={type.id.toString()}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="phase_id">Phase</Label>
              <Select name="phase_id" defaultValue={school?.phase?.id?.toString() ?? ""}>
                <SelectTrigger id="phase_id">
                  <SelectValue placeholder="Select phase" />
                </SelectTrigger>
                <SelectContent>
                  {phases.map((phase) => (
                    <SelectItem key={phase.id} value={phase.id.toString()}>
                      {phase.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="religious_affiliation_id">Religious Affiliation</Label>
              <Select name="religious_affiliation_id" defaultValue={school?.religious_affiliation?.id?.toString() ?? ""}>
                <SelectTrigger id="religious_affiliation_id">
                  <SelectValue placeholder="Select affiliation" />
                </SelectTrigger>
                <SelectContent>
                  {religiousAffiliations.map((affiliation) => (
                    <SelectItem key={affiliation.id} value={affiliation.id.toString()}>
                      {affiliation.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-2">
              <Label htmlFor="pupil_count">Pupil Count</Label>
              <Input
                id="pupil_count"
                name="pupil_count"
                type="number"
                placeholder="e.g. 1500"
                defaultValue={school?.pupil_count ?? ""}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="boarder_count">Boarder Count</Label>
              <Input
                id="boarder_count"
                name="boarder_count"
                type="number"
                placeholder="e.g. 500"
                defaultValue={school?.boarder_count ?? ""}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="boarder_age_min">Boarder Age From</Label>
              <Input
                id="boarder_age_min"
                name="boarder_age_min"
                type="number"
                min="0"
                max="25"
                placeholder="e.g. 11"
                defaultValue={school?.boarder_age_min ?? ""}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="boarder_age_max">Boarder Age To</Label>
              <Input
                id="boarder_age_max"
                name="boarder_age_max"
                type="number"
                min="0"
                max="25"
                placeholder="e.g. 18"
                defaultValue={school?.boarder_age_max ?? ""}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="school_age_min">School Age From</Label>
              <Input
                id="school_age_min"
                name="school_age_min"
                type="number"
                min="0"
                max="25"
                placeholder="e.g. 3"
                defaultValue={school?.school_age_min ?? ""}
              />
              <p className="text-xs text-muted-foreground">
                Whole school, including day pupils
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="school_age_max">School Age To</Label>
              <Input
                id="school_age_max"
                name="school_age_max"
                type="number"
                min="0"
                max="25"
                placeholder="e.g. 18"
                defaultValue={school?.school_age_max ?? ""}
              />
            </div>
          </div>

          {/* Three states, not two. The comparison export prints "not offered"
              for No and "NP" for Unknown, which are different claims — so an
              unanswered question must stay unanswered rather than defaulting
              to No when someone edits an unrelated field. */}
          <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="offers_a_level">Offers A-Levels</Label>
              <Select name="offers_a_level" defaultValue={boolToSelect(school?.offers_a_level)}>
                <SelectTrigger id="offers_a_level">
                  <SelectValue placeholder="Unknown" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="unknown">Unknown</SelectItem>
                  <SelectItem value="yes">Yes</SelectItem>
                  <SelectItem value="no">No</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="offers_ib">Offers IB Diploma</Label>
              <Select name="offers_ib" defaultValue={boolToSelect(school?.offers_ib)}>
                <SelectTrigger id="offers_ib">
                  <SelectValue placeholder="Unknown" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="unknown">Unknown</SelectItem>
                  <SelectItem value="yes">Yes</SelectItem>
                  <SelectItem value="no">No</SelectItem>
                </SelectContent>
              </Select>
            </div>
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
          <CardDescription>How to reach the school</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="telephone">Telephone</Label>
              <PhoneInput
                name="telephone"
                defaultValue={school?.telephone ?? ""}
                defaultCountryCode="44"
                placeholder="e.g. 1234 567890"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="fax">Fax</Label>
              <PhoneInput
                name="fax"
                defaultValue={school?.fax ?? ""}
                defaultCountryCode="44"
                placeholder="e.g. 1234 567891"
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="e.g. admissions@school.ac.uk"
                defaultValue={school?.email ?? ""}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="website">Website</Label>
              <Input
                id="website"
                name="website"
                placeholder="e.g. www.school.ac.uk"
                defaultValue={school?.website ?? ""}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Address */}
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="text-base font-medium flex items-center gap-2">
            <MapPin className="h-4 w-4 text-muted-foreground" />
            Address
          </CardTitle>
          <CardDescription>School location details</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="address">Street Address</Label>
            <Input
              id="address"
              name="address"
              placeholder="e.g. High Street"
              defaultValue={school?.address ?? ""}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-2">
              <Label htmlFor="city">City</Label>
              <Input
                id="city"
                name="city"
                placeholder="e.g. Windsor"
                defaultValue={school?.city ?? ""}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="county">County</Label>
              <Input
                id="county"
                name="county"
                placeholder="e.g. Berkshire"
                defaultValue={school?.county ?? ""}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="postcode">Postcode</Label>
              <Input
                id="postcode"
                name="postcode"
                placeholder="e.g. SL4 6DW"
                defaultValue={school?.postcode ?? ""}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="country_id">Country</Label>
              <Select name="country_id" defaultValue={school?.country?.id?.toString() ?? ""}>
                <SelectTrigger id="country_id">
                  <SelectValue placeholder="Select country" />
                </SelectTrigger>
                <SelectContent>
                  {countries.map((country) => (
                    <SelectItem key={country.id} value={country.id.toString()}>
                      {country.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Visa & Admissions */}
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="text-base font-medium flex items-center gap-2">
            <FileText className="h-4 w-4 text-muted-foreground" />
            Visa & Admissions
          </CardTitle>
          <CardDescription>Visa acceptance and admissions status</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex flex-wrap gap-6">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="accepts_applications"
                name="accepts_applications"
                defaultChecked={school?.accepts_applications ?? true}
              />
              <Label htmlFor="accepts_applications" className="text-sm font-normal">
                Accepting Applications
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="accepts_child_visa"
                name="accepts_child_visa"
                defaultChecked={school?.accepts_child_visa ?? false}
              />
              <Label htmlFor="accepts_child_visa" className="text-sm font-normal">
                Accepts Child Visa
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="accepts_general_visa"
                name="accepts_general_visa"
                defaultChecked={school?.accepts_general_visa ?? false}
              />
              <Label htmlFor="accepts_general_visa" className="text-sm font-normal">
                Accepts General Visa
              </Label>
            </div>
          </div>

          <div className="space-y-2 max-w-xs">
            <Label htmlFor="child_visa_age">Minimum Child Visa Age</Label>
            <Input
              id="child_visa_age"
              name="child_visa_age"
              type="number"
              placeholder="e.g. 11"
              defaultValue={school?.child_visa_age ?? ""}
            />
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
          <CardDescription>Keywords and notes</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="keywords">Keywords</Label>
            <Input
              id="keywords"
              name="keywords"
              placeholder="e.g. boarding, prestigious, historic (comma separated)"
              defaultValue={school?.keywords ?? ""}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="remarks">Remarks / Notes</Label>
            <Textarea
              id="remarks"
              name="remarks"
              placeholder="Any additional notes about the school..."
              rows={4}
              defaultValue={school?.remarks ?? ""}
            />
          </div>
        </CardContent>
      </Card>

      {/* Form Actions */}
      <div className="flex items-center justify-end gap-4 pb-8">
        <Button type="button" variant="outline" asChild>
          <Link href={school?.id ? `/schools/${school.id}` : "/schools"}>
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
              {mode === "create" ? "Create School" : "Save Changes"}
            </>
          )}
        </Button>
      </div>
    </form>
  )
}
