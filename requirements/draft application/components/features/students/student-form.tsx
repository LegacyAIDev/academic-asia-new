"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Save, X, Plus, Trash2 } from "lucide-react"
import { useRouter } from "next/navigation"
import type { StudentProfile } from "@/lib/dummy-data/students"

interface StudentFormProps {
  student?: StudentProfile
  mode: "create" | "edit"
}

export function StudentForm({ student, mode }: StudentFormProps) {
  const router = useRouter()
  const [formData, setFormData] = useState<Partial<StudentProfile>>(
    student || {
      case: "New",
      studentType: "AA Student",
      gender: "M",
      contacts: [],
    },
  )

  const [contacts, setContacts] = useState(student?.contacts || [])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    // TODO: Implement save logic with Supabase
    console.log("Saving student:", { ...formData, contacts })
    alert(`Student ${mode === "create" ? "created" : "updated"} successfully!`)
    router.push("/students")
  }

  const addContact = () => {
    setContacts([
      ...contacts,
      {
        relationship: "",
        surname: "",
        firstname: "",
        chineseName: "",
        gender: "M",
        occupation: "",
        tel: "",
        mobile: "",
        fax: "",
        email: "",
      },
    ])
  }

  const removeContact = (index: number) => {
    setContacts(contacts.filter((_, i) => i !== index))
  }

  const updateContact = (index: number, field: string, value: string) => {
    const newContacts = [...contacts]
    newContacts[index] = { ...newContacts[index], [field]: value }
    setContacts(newContacts)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {mode === "create" ? "Create New Student" : `Edit Student - ${student?.name}`}
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Home / Students / <span className="text-gray-700">{mode === "create" ? "New" : "Edit"}</span>
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button type="button" variant="outline" onClick={() => router.back()}>
            <X className="h-4 w-4 mr-2" />
            Cancel
          </Button>
          <Button type="submit" className="bg-blue-600 hover:bg-blue-700">
            <Save className="h-4 w-4 mr-2" />
            Save Student
          </Button>
        </div>
      </div>

      {/* Form Tabs */}
      <Card>
        <CardContent className="p-0">
          <Tabs defaultValue="basic" className="w-full">
            <div className="border-b border-gray-200 px-6">
              <TabsList className="h-auto p-0 bg-transparent">
                <TabsTrigger
                  value="basic"
                  className="rounded-none border-b-2 border-transparent data-[state=active]:border-blue-600 data-[state=active]:bg-transparent px-4 py-3"
                >
                  Basic Information
                </TabsTrigger>
                <TabsTrigger
                  value="academic"
                  className="rounded-none border-b-2 border-transparent data-[state=active]:border-blue-600 data-[state=active]:bg-transparent px-4 py-3"
                >
                  Academic Details
                </TabsTrigger>
                <TabsTrigger
                  value="contact"
                  className="rounded-none border-b-2 border-transparent data-[state=active]:border-blue-600 data-[state=active]:bg-transparent px-4 py-3"
                >
                  Contact Information
                </TabsTrigger>
                <TabsTrigger
                  value="parents"
                  className="rounded-none border-b-2 border-transparent data-[state=active]:border-blue-600 data-[state=active]:bg-transparent px-4 py-3"
                >
                  Parent/Guardian ({contacts.length})
                </TabsTrigger>
              </TabsList>
            </div>

            <div className="p-6">
              {/* Basic Information Tab */}
              <TabsContent value="basic" className="mt-0 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField label="Student ID" required>
                    <Input
                      placeholder="e.g., S044751"
                      value={formData.id || ""}
                      onChange={(e) => setFormData({ ...formData, id: e.target.value })}
                      disabled={mode === "edit"}
                    />
                  </FormField>

                  <FormField label="AA Reference" required>
                    <Input
                      placeholder="e.g., 0047308"
                      value={formData.aaRef || ""}
                      onChange={(e) => setFormData({ ...formData, aaRef: e.target.value })}
                    />
                  </FormField>

                  <FormField label="Surname" required>
                    <Input
                      placeholder="Enter surname"
                      value={formData.surname || ""}
                      onChange={(e) => setFormData({ ...formData, surname: e.target.value })}
                    />
                  </FormField>

                  <FormField label="First Name" required>
                    <Input
                      placeholder="Enter first name"
                      value={formData.firstname || ""}
                      onChange={(e) => setFormData({ ...formData, firstname: e.target.value })}
                    />
                  </FormField>

                  <FormField label="Chinese Name">
                    <Input
                      placeholder="輸入中文名稱"
                      value={formData.chineseName || ""}
                      onChange={(e) => setFormData({ ...formData, chineseName: e.target.value })}
                    />
                  </FormField>

                  <FormField label="Gender" required>
                    <Select
                      value={formData.gender}
                      onValueChange={(value) => setFormData({ ...formData, gender: value as "M" | "F" })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="M">Male</SelectItem>
                        <SelectItem value="F">Female</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormField>

                  <FormField label="Date of Birth" required>
                    <Input
                      type="date"
                      value={formData.dateOfBirth || ""}
                      onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
                    />
                  </FormField>

                  <FormField label="Passport Type" required>
                    <Select
                      value={formData.passport}
                      onValueChange={(value) => setFormData({ ...formData, passport: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select passport type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="HKSAR">HKSAR</SelectItem>
                        <SelectItem value="British C">British Citizen</SelectItem>
                        <SelectItem value="Canada">Canada</SelectItem>
                        <SelectItem value="Australia">Australia</SelectItem>
                        <SelectItem value="USA">USA</SelectItem>
                        <SelectItem value="China">China</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormField>

                  <FormField label="Nationality">
                    <Input
                      placeholder="e.g., HKSAR"
                      value={formData.nationality || ""}
                      onChange={(e) => setFormData({ ...formData, nationality: e.target.value })}
                    />
                  </FormField>

                  <FormField label="Case Status" required>
                    <Select
                      value={formData.case}
                      onValueChange={(value) =>
                        setFormData({ ...formData, case: value as "Active" | "New" | "Archived" })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="New">New</SelectItem>
                        <SelectItem value="Active">Active</SelectItem>
                        <SelectItem value="Archived">Archived</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormField>

                  <FormField label="Student Type">
                    <Select
                      value={formData.studentType}
                      onValueChange={(value) => setFormData({ ...formData, studentType: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="AA Student">AA Student</SelectItem>
                        <SelectItem value="Consultant">Consultant</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormField>

                  <FormField label="Source">
                    <Select
                      value={formData.source}
                      onValueChange={(value) => setFormData({ ...formData, source: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select source" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Walk-in (Friends)">Walk-in (Friends)</SelectItem>
                        <SelectItem value="Website">Website</SelectItem>
                        <SelectItem value="Referral">Referral</SelectItem>
                        <SelectItem value="Social Media">Social Media</SelectItem>
                        <SelectItem value="Event">Event</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormField>

                  <FormField label="Placement Remarks" fullWidth>
                    <Textarea
                      placeholder="Enter placement remarks"
                      rows={3}
                      value={formData.placement || ""}
                      onChange={(e) => setFormData({ ...formData, placement: e.target.value })}
                    />
                  </FormField>

                  <FormField label="General Remarks" fullWidth>
                    <Textarea
                      placeholder="Enter any additional remarks"
                      rows={3}
                      value={formData.remarks || ""}
                      onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                    />
                  </FormField>
                </div>
              </TabsContent>

              {/* Academic Details Tab */}
              <TabsContent value="academic" className="mt-0 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField label="Present School">
                    <Input
                      placeholder="Enter current school"
                      value={formData.presentSchool || ""}
                      onChange={(e) => setFormData({ ...formData, presentSchool: e.target.value })}
                    />
                  </FormField>

                  <FormField label="School Type">
                    <Select
                      value={formData.schoolType}
                      onValueChange={(value) => setFormData({ ...formData, schoolType: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select school type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Hong Kong - Local">Hong Kong - Local</SelectItem>
                        <SelectItem value="Hong Kong - International">Hong Kong - International</SelectItem>
                        <SelectItem value="UK">UK</SelectItem>
                        <SelectItem value="USA">USA</SelectItem>
                        <SelectItem value="Canada">Canada</SelectItem>
                        <SelectItem value="Australia">Australia</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormField>

                  <FormField label="Year Apply" required>
                    <Select
                      value={formData.yearApply}
                      onValueChange={(value) => setFormData({ ...formData, yearApply: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select year" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Year 7">Year 7</SelectItem>
                        <SelectItem value="Year 8">Year 8</SelectItem>
                        <SelectItem value="Year 9">Year 9</SelectItem>
                        <SelectItem value="Year 10">Year 10</SelectItem>
                        <SelectItem value="Year 11">Year 11</SelectItem>
                        <SelectItem value="Year 12">Year 12</SelectItem>
                        <SelectItem value="Year 13">Year 13</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormField>

                  <FormField label="Applying For">
                    <Select
                      value={formData.applying}
                      onValueChange={(value) => setFormData({ ...formData, applying: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select year" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Year 9">Year 9</SelectItem>
                        <SelectItem value="Year 10">Year 10</SelectItem>
                        <SelectItem value="Year 11">Year 11</SelectItem>
                        <SelectItem value="Year 12">Year 12</SelectItem>
                        <SelectItem value="Year 13">Year 13</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormField>

                  <FormField label="Entry Year" required>
                    <Select
                      value={formData.entryYear}
                      onValueChange={(value) => setFormData({ ...formData, entryYear: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select entry year" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Sep-2024">Sep-2024</SelectItem>
                        <SelectItem value="Sep-2025">Sep-2025</SelectItem>
                        <SelectItem value="Sep-2026">Sep-2026</SelectItem>
                        <SelectItem value="Sep-2027">Sep-2027</SelectItem>
                        <SelectItem value="Sep-2028">Sep-2028</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormField>

                  <FormField label="Enrollment Date">
                    <Input
                      type="date"
                      value={formData.enrollDate || ""}
                      onChange={(e) => setFormData({ ...formData, enrollDate: e.target.value })}
                    />
                  </FormField>

                  <FormField label="Test Paper">
                    <Select
                      value={formData.testPaper}
                      onValueChange={(value) => setFormData({ ...formData, testPaper: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select test paper" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Year 7">Year 7</SelectItem>
                        <SelectItem value="Year 8">Year 8</SelectItem>
                        <SelectItem value="Year 9">Year 9</SelectItem>
                        <SelectItem value="Year 10">Year 10</SelectItem>
                        <SelectItem value="Year 11">Year 11</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormField>

                  <FormField label="Assigned Officer">
                    <Select
                      value={formData.officer}
                      onValueChange={(value) => setFormData({ ...formData, officer: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select officer" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Jesse CHAN">Jesse CHAN</SelectItem>
                        <SelectItem value="Battie FUNG">Battie FUNG</SelectItem>
                        <SelectItem value="CHOW Hoi Sun Hayson">CHOW Hoi Sun Hayson</SelectItem>
                        <SelectItem value="CHOW Jamie Haole">CHOW Jamie Haole</SelectItem>
                        <SelectItem value="LAU Waiyhan Wai Fung">LAU Waiyhan Wai Fung</SelectItem>
                        <SelectItem value="YIU Hayden">YIU Hayden</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormField>
                </div>
              </TabsContent>

              {/* Contact Information Tab */}
              <TabsContent value="contact" className="mt-0 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField label="Mobile" required>
                    <Input
                      placeholder="Enter mobile number"
                      value={formData.mobile || ""}
                      onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
                    />
                  </FormField>

                  <FormField label="Contact Tel">
                    <Input
                      placeholder="Enter contact telephone"
                      value={formData.contactTel || ""}
                      onChange={(e) => setFormData({ ...formData, contactTel: e.target.value })}
                    />
                  </FormField>

                  <FormField label="Contact Fax">
                    <Input
                      placeholder="Enter fax number"
                      value={formData.contactFax || ""}
                      onChange={(e) => setFormData({ ...formData, contactFax: e.target.value })}
                    />
                  </FormField>

                  <FormField label="Email">
                    <Input
                      type="email"
                      placeholder="Enter email address"
                      value={formData.email || ""}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    />
                  </FormField>

                  <FormField label="Address (1)" fullWidth>
                    <Textarea
                      placeholder="Enter primary address"
                      rows={2}
                      value={formData.address1 || ""}
                      onChange={(e) => setFormData({ ...formData, address1: e.target.value })}
                    />
                  </FormField>

                  <FormField label="Address (2)" fullWidth>
                    <Textarea
                      placeholder="Enter secondary address (optional)"
                      rows={2}
                      value={formData.address2 || ""}
                      onChange={(e) => setFormData({ ...formData, address2: e.target.value })}
                    />
                  </FormField>

                  <FormField label="Chinese Address" fullWidth>
                    <Textarea
                      placeholder="輸入中文地址"
                      rows={2}
                      value={formData.chineseAddress || ""}
                      onChange={(e) => setFormData({ ...formData, chineseAddress: e.target.value })}
                    />
                  </FormField>
                </div>
              </TabsContent>

              {/* Parent/Guardian Tab */}
              <TabsContent value="parents" className="mt-0 space-y-6">
                <div className="flex items-center justify-between mb-4">
                  <p className="text-sm text-gray-600">Add parent or guardian contact information</p>
                  <Button type="button" variant="outline" size="sm" onClick={addContact}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Contact
                  </Button>
                </div>

                {contacts.length === 0 && (
                  <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                    <p className="text-gray-600">No parent/guardian contacts added yet</p>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={addContact}
                      className="mt-4 bg-transparent"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add First Contact
                    </Button>
                  </div>
                )}

                {contacts.map((contact, index) => (
                  <Card key={index} className="border-2">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                      <div>
                        <CardTitle className="text-base">Contact {index + 1}</CardTitle>
                        <CardDescription>Parent or Guardian Information</CardDescription>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeContact(index)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField label="Relationship" required>
                          <Select
                            value={contact.relationship}
                            onValueChange={(value) => updateContact(index, "relationship", value)}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select relationship" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Mother">Mother</SelectItem>
                              <SelectItem value="Father">Father</SelectItem>
                              <SelectItem value="Guardian">Guardian</SelectItem>
                              <SelectItem value="Grandparent">Grandparent</SelectItem>
                              <SelectItem value="Other">Other</SelectItem>
                            </SelectContent>
                          </Select>
                        </FormField>

                        <FormField label="Gender" required>
                          <Select
                            value={contact.gender}
                            onValueChange={(value) => updateContact(index, "gender", value)}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="M">Male</SelectItem>
                              <SelectItem value="F">Female</SelectItem>
                            </SelectContent>
                          </Select>
                        </FormField>

                        <FormField label="Surname" required>
                          <Input
                            placeholder="e.g., Mr, Ms, Mrs"
                            value={contact.surname}
                            onChange={(e) => updateContact(index, "surname", e.target.value)}
                          />
                        </FormField>

                        <FormField label="First Name" required>
                          <Input
                            placeholder="Enter first name"
                            value={contact.firstname}
                            onChange={(e) => updateContact(index, "firstname", e.target.value)}
                          />
                        </FormField>

                        <FormField label="Chinese Name">
                          <Input
                            placeholder="輸入中文名稱"
                            value={contact.chineseName}
                            onChange={(e) => updateContact(index, "chineseName", e.target.value)}
                          />
                        </FormField>

                        <FormField label="Occupation">
                          <Input
                            placeholder="Enter occupation"
                            value={contact.occupation}
                            onChange={(e) => updateContact(index, "occupation", e.target.value)}
                          />
                        </FormField>

                        <FormField label="Telephone">
                          <Input
                            placeholder="Enter telephone"
                            value={contact.tel}
                            onChange={(e) => updateContact(index, "tel", e.target.value)}
                          />
                        </FormField>

                        <FormField label="Mobile" required>
                          <Input
                            placeholder="Enter mobile"
                            value={contact.mobile}
                            onChange={(e) => updateContact(index, "mobile", e.target.value)}
                          />
                        </FormField>

                        <FormField label="Fax">
                          <Input
                            placeholder="Enter fax"
                            value={contact.fax}
                            onChange={(e) => updateContact(index, "fax", e.target.value)}
                          />
                        </FormField>

                        <FormField label="Email">
                          <Input
                            type="email"
                            placeholder="Enter email"
                            value={contact.email}
                            onChange={(e) => updateContact(index, "email", e.target.value)}
                          />
                        </FormField>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </TabsContent>
            </div>
          </Tabs>
        </CardContent>
      </Card>

      {/* Footer Actions */}
      <div className="flex items-center justify-end space-x-2 pt-4 border-t border-gray-200">
        <Button type="button" variant="outline" onClick={() => router.back()}>
          Cancel
        </Button>
        <Button type="submit" className="bg-blue-600 hover:bg-blue-700">
          <Save className="h-4 w-4 mr-2" />
          {mode === "create" ? "Create Student" : "Save Changes"}
        </Button>
      </div>
    </form>
  )
}

function FormField({
  label,
  required,
  children,
  fullWidth,
}: {
  label: string
  required?: boolean
  children: React.ReactNode
  fullWidth?: boolean
}) {
  return (
    <div className={fullWidth ? "col-span-2" : ""}>
      <Label className="text-sm font-medium text-gray-700">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </Label>
      <div className="mt-1.5">{children}</div>
    </div>
  )
}
