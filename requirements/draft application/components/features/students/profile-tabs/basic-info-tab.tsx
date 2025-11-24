import type React from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Pencil } from "lucide-react"
import type { StudentProfile } from "@/lib/dummy-data/students"

interface BasicInfoTabProps {
  student: StudentProfile
}

export function BasicInfoTab({ student }: BasicInfoTabProps) {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold text-gray-900">Student Information</h3>
        <Button size="sm" variant="outline">
          <Pencil className="h-4 w-4 mr-2" />
          Edit
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Left Column */}
        <div className="space-y-6">
          <InfoSection title="Personal Details">
            <InfoRow label="ST. ID" value={student.id} valueClass="font-mono" />
            <InfoRow label="AA Ref" value={student.aaRef} valueClass="font-mono" />
            <InfoRow label="Surname" value={student.surname} />
            <InfoRow label="Firstname" value={student.firstname} />
            <InfoRow label="Chinese Name" value={student.chineseName} />
            <InfoRow label="Date of Birth" value={student.dateOfBirth} />
            <InfoRow label="Gender" value={student.gender === "M" ? "Male" : "Female"} />
            <InfoRow label="Passport Type" value={student.passport} />
          </InfoSection>

          <InfoSection title="Academic Information">
            <InfoRow label="Student Type" value={student.studentType} />
            <InfoRow label="Case" value={student.case} highlight />
            <InfoRow label="Placement Remarks" value={student.placement} />
            <InfoRow label="Present School" value={student.presentSchool} />
            <InfoRow label="School Type" value={student.schoolType} />
            <InfoRow label="Nationality" value={student.nationality} />
          </InfoSection>
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          <InfoSection title="Application Details">
            <InfoRow
              label="AA Test Result"
              value={`Eng: ${student.aaTestResult.eng}, Math: ${student.aaTestResult.math}`}
            />
            <InfoRow label="Test Paper" value={student.testPaper} />
            <InfoRow label="Year Apply" value={student.yearApply} />
            <InfoRow label="Applying" value={student.applying} highlight />
            <InfoRow label="Entry Year" value={student.entryYear} highlight />
            <InfoRow label="Enrol Date" value={student.enrollDate} />
          </InfoSection>

          <InfoSection title="Officer & Source">
            <InfoRow label="Officer" value={student.officer} />
            <InfoRow label="Source" value={student.source} />
          </InfoSection>

          <InfoSection title="Address">
            <InfoRow label="Address (1)" value={student.address1} />
            {student.address2 && <InfoRow label="Address (2)" value={student.address2} />}
            {student.chineseAddress && <InfoRow label="Chinese Address" value={student.chineseAddress} />}
          </InfoSection>

          {student.remarks && (
            <InfoSection title="Remarks">
              <InfoRow label="Remark" value={student.remarks} />
            </InfoSection>
          )}
        </div>
      </div>

      <div className="pt-4 border-t border-gray-200">
        <p className="text-xs text-gray-500">
          Last Updated: <span className="font-medium text-gray-700">{student.updated}</span>
        </p>
      </div>
    </div>
  )
}

function InfoSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card className="p-4 bg-gray-50/50">
      <h4 className="text-sm font-semibold text-gray-900 mb-4 pb-2 border-b border-gray-200">{title}</h4>
      <div className="space-y-3">{children}</div>
    </Card>
  )
}

function InfoRow({
  label,
  value,
  valueClass = "",
  highlight = false,
}: {
  label: string
  value: string
  valueClass?: string
  highlight?: boolean
}) {
  return (
    <div className="flex justify-between items-start text-sm">
      <span className="text-gray-600 font-medium min-w-[140px]">{label}:</span>
      <span
        className={`text-gray-900 text-right flex-1 ${valueClass} ${highlight ? "font-semibold text-blue-600" : ""}`}
      >
        {value}
      </span>
    </div>
  )
}
