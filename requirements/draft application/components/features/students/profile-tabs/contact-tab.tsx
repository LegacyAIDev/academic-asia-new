import type React from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Mail, Phone, Pencil } from "lucide-react"
import type { StudentProfile } from "@/lib/dummy-data/students"

interface ContactTabProps {
  student: StudentProfile
}

export function ContactTab({ student }: ContactTabProps) {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold text-gray-900">Contact Information</h3>
        <Button size="sm" variant="outline">
          <Pencil className="h-4 w-4 mr-2" />
          Edit
        </Button>
      </div>

      {/* Student Contact */}
      <Card className="p-6">
        <h4 className="text-base font-semibold text-gray-900 mb-4 pb-2 border-b border-gray-200">
          Student Contact Details
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <ContactItem icon={<Phone className="h-4 w-4" />} label="Contact Tel" value={student.contactTel} />
          <ContactItem icon={<Phone className="h-4 w-4" />} label="Mobile" value={student.mobile} />
          {student.contactFax && (
            <ContactItem icon={<Phone className="h-4 w-4" />} label="Fax" value={student.contactFax} />
          )}
          <ContactItem
            icon={<Mail className="h-4 w-4" />}
            label="Email"
            value={student.email}
            link={`mailto:${student.email}`}
          />
        </div>
      </Card>

      {/* Parent/Guardian Contacts */}
      {student.contacts.map((contact, index) => (
        <Card key={index} className="p-6">
          <div className="flex items-center justify-between mb-4 pb-2 border-b border-gray-200">
            <h4 className="text-base font-semibold text-gray-900">
              {contact.relationship} - {contact.surname} {contact.firstname}
            </h4>
            <span className="text-sm text-gray-500">{contact.gender === "M" ? "Male" : "Female"}</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-3">
              <InfoField label="Surname" value={contact.surname} />
              <InfoField label="Firstname" value={contact.firstname} />
              {contact.chineseName && <InfoField label="Chinese Name" value={contact.chineseName} />}
              <InfoField label="Occupation" value={contact.occupation} />
            </div>
            <div className="space-y-3">
              {contact.tel && <ContactItem icon={<Phone className="h-4 w-4" />} label="Tel" value={contact.tel} />}
              <ContactItem icon={<Phone className="h-4 w-4" />} label="Mobile" value={contact.mobile} />
              {contact.fax && <ContactItem icon={<Phone className="h-4 w-4" />} label="Fax" value={contact.fax} />}
              {contact.email && (
                <ContactItem
                  icon={<Mail className="h-4 w-4" />}
                  label="Email"
                  value={contact.email}
                  link={`mailto:${contact.email}`}
                />
              )}
            </div>
          </div>
        </Card>
      ))}
    </div>
  )
}

function InfoField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-gray-500 mb-1">{label}</p>
      <p className="text-sm font-medium text-gray-900">{value}</p>
    </div>
  )
}

function ContactItem({
  icon,
  label,
  value,
  link,
}: {
  icon: React.ReactNode
  label: string
  value: string
  link?: string
}) {
  return (
    <div className="flex items-center space-x-3">
      <div className="text-gray-400">{icon}</div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-gray-500">{label}</p>
        {link ? (
          <a href={link} className="text-sm font-medium text-blue-600 hover:text-blue-700 hover:underline break-all">
            {value}
          </a>
        ) : (
          <p className="text-sm font-medium text-gray-900 break-all">{value}</p>
        )}
      </div>
    </div>
  )
}
