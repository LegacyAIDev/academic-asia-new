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
import { Checkbox } from "@/components/ui/checkbox"
import { Save, X, Plus, Trash2 } from "lucide-react"
import { useRouter } from "next/navigation"
import type { SchoolProfile, SchoolContact } from "@/lib/dummy-data/schools"

interface SchoolFormProps {
  school?: SchoolProfile
  mode: "create" | "edit"
}

export function SchoolForm({ school, mode }: SchoolFormProps) {
  const router = useRouter()
  const [formData, setFormData] = useState<Partial<SchoolProfile>>(
    school || {
      schoolType: "Co-ed",
      boardingType: "Day & Boarding",
      curriculum: [],
      schoolLevel: [],
      examBoards: [],
      languagesOffered: [],
      facilities: [],
      sports: [],
      extracurricular: [],
      scholarships: false,
      status: "Active",
      feesPerTerm: {},
    },
  )

  const [contacts, setContacts] = useState<Partial<SchoolContact>[]>([])
  const [curriculum, setCurriculum] = useState<string[]>(school?.curriculum || [])
  const [schoolLevels, setSchoolLevels] = useState<string[]>(school?.schoolLevel || [])
  const [examBoards, setExamBoards] = useState<string[]>(school?.examBoards || [])
  const [languages, setLanguages] = useState<string[]>(school?.languagesOffered || [])
  const [facilities, setFacilities] = useState<string[]>(school?.facilities || [])
  const [sports, setSports] = useState<string[]>(school?.sports || [])
  const [extracurricular, setExtracurricular] = useState<string[]>(school?.extracurricular || [])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    // TODO: Implement save logic with Supabase
    console.log("Saving school:", {
      ...formData,
      curriculum,
      schoolLevel: schoolLevels,
      examBoards,
      languagesOffered: languages,
      facilities,
      sports,
      extracurricular,
      contacts,
    })
    alert(`School ${mode === "create" ? "created" : "updated"} successfully!`)
    router.push("/schools")
  }

  const addContact = () => {
    setContacts([
      ...contacts,
      {
        name: "",
        position: "",
        email: "",
        telephone: "",
        mobile: "",
        isPrimary: contacts.length === 0,
      },
    ])
  }

  const removeContact = (index: number) => {
    setContacts(contacts.filter((_, i) => i !== index))
  }

  const updateContact = (index: number, field: string, value: string | boolean) => {
    const newContacts = [...contacts]
    newContacts[index] = { ...newContacts[index], [field]: value }
    setContacts(newContacts)
  }

  const toggleArrayItem = (array: string[], setArray: (arr: string[]) => void, item: string) => {
    if (array.includes(item)) {
      setArray(array.filter((i) => i !== item))
    } else {
      setArray([...array, item])
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {mode === "create" ? "Create New School" : `Edit School - ${school?.schoolName}`}
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Home / Schools / <span className="text-gray-700">{mode === "create" ? "New" : "Edit"}</span>
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button type="button" variant="outline" onClick={() => router.back()}>
            <X className="h-4 w-4 mr-2" />
            Cancel
          </Button>
          <Button type="submit" className="bg-blue-600 hover:bg-blue-700">
            <Save className="h-4 w-4 mr-2" />
            Save School
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
                  value="admissions"
                  className="rounded-none border-b-2 border-transparent data-[state=active]:border-blue-600 data-[state=active]:bg-transparent px-4 py-3"
                >
                  Admissions & Fees
                </TabsTrigger>
                <TabsTrigger
                  value="facilities"
                  className="rounded-none border-b-2 border-transparent data-[state=active]:border-blue-600 data-[state=active]:bg-transparent px-4 py-3"
                >
                  Facilities & Activities
                </TabsTrigger>
                <TabsTrigger
                  value="contacts"
                  className="rounded-none border-b-2 border-transparent data-[state=active]:border-blue-600 data-[state=active]:bg-transparent px-4 py-3"
                >
                  Contacts ({contacts.length})
                </TabsTrigger>
                <TabsTrigger
                  value="partnership"
                  className="rounded-none border-b-2 border-transparent data-[state=active]:border-blue-600 data-[state=active]:bg-transparent px-4 py-3"
                >
                  Partnership
                </TabsTrigger>
              </TabsList>
            </div>

            <div className="p-6">
              {/* Basic Information Tab */}
              <TabsContent value="basic" className="mt-0 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField label="School ID" required>
                    <Input
                      placeholder="e.g., SCH001"
                      value={formData.id || ""}
                      onChange={(e) => setFormData({ ...formData, id: e.target.value })}
                      disabled={mode === "edit"}
                    />
                  </FormField>

                  <FormField label="School Name" required>
                    <Input
                      placeholder="Enter full school name"
                      value={formData.schoolName || ""}
                      onChange={(e) => setFormData({ ...formData, schoolName: e.target.value })}
                    />
                  </FormField>

                  <FormField label="Short Name" required>
                    <Input
                      placeholder="Enter short name"
                      value={formData.shortName || ""}
                      onChange={(e) => setFormData({ ...formData, shortName: e.target.value })}
                    />
                  </FormField>

                  <FormField label="Founded Year">
                    <Input
                      placeholder="e.g., 1440"
                      value={formData.founded || ""}
                      onChange={(e) => setFormData({ ...formData, founded: e.target.value })}
                    />
                  </FormField>

                  <FormField label="School Type" required>
                    <Select
                      value={formData.schoolType}
                      onValueChange={(value) =>
                        setFormData({ ...formData, schoolType: value as "Boys" | "Girls" | "Co-ed" })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Boys">Boys</SelectItem>
                        <SelectItem value="Girls">Girls</SelectItem>
                        <SelectItem value="Co-ed">Co-ed</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormField>

                  <FormField label="Boarding Type" required>
                    <Select
                      value={formData.boardingType}
                      onValueChange={(value) => setFormData({ ...formData, boardingType: value as any })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Day">Day</SelectItem>
                        <SelectItem value="Boarding">Boarding</SelectItem>
                        <SelectItem value="Day & Boarding">Day & Boarding</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormField>

                  <FormField label="Religious Affiliation">
                    <Select
                      value={formData.religiousAffiliation}
                      onValueChange={(value) => setFormData({ ...formData, religiousAffiliation: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select affiliation" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Church of England">Church of England</SelectItem>
                        <SelectItem value="Catholic">Catholic</SelectItem>
                        <SelectItem value="Non-denominational">Non-denominational</SelectItem>
                        <SelectItem value="Jewish">Jewish</SelectItem>
                        <SelectItem value="Muslim">Muslim</SelectItem>
                        <SelectItem value="Other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormField>

                  <FormField label="Headmaster/Principal">
                    <Input
                      placeholder="Enter name"
                      value={formData.headmaster || ""}
                      onChange={(e) => setFormData({ ...formData, headmaster: e.target.value })}
                    />
                  </FormField>

                  <FormField label="Country" required>
                    <Select
                      value={formData.country}
                      onValueChange={(value) => setFormData({ ...formData, country: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select country" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="United Kingdom">United Kingdom</SelectItem>
                        <SelectItem value="United States">United States</SelectItem>
                        <SelectItem value="Canada">Canada</SelectItem>
                        <SelectItem value="Australia">Australia</SelectItem>
                        <SelectItem value="Switzerland">Switzerland</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormField>

                  <FormField label="Region">
                    <Input
                      placeholder="e.g., South East England"
                      value={formData.region || ""}
                      onChange={(e) => setFormData({ ...formData, region: e.target.value })}
                    />
                  </FormField>

                  <FormField label="City" required>
                    <Input
                      placeholder="Enter city"
                      value={formData.city || ""}
                      onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    />
                  </FormField>

                  <FormField label="Postcode">
                    <Input
                      placeholder="Enter postcode"
                      value={formData.postcode || ""}
                      onChange={(e) => setFormData({ ...formData, postcode: e.target.value })}
                    />
                  </FormField>

                  <FormField label="Address" fullWidth>
                    <Textarea
                      placeholder="Enter full address"
                      rows={2}
                      value={formData.address || ""}
                      onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    />
                  </FormField>

                  <FormField label="Telephone" required>
                    <Input
                      placeholder="e.g., +44 1234 567890"
                      value={formData.telephone || ""}
                      onChange={(e) => setFormData({ ...formData, telephone: e.target.value })}
                    />
                  </FormField>

                  <FormField label="Email" required>
                    <Input
                      type="email"
                      placeholder="admissions@school.com"
                      value={formData.email || ""}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    />
                  </FormField>

                  <FormField label="Website">
                    <Input
                      placeholder="www.school.com"
                      value={formData.website || ""}
                      onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                    />
                  </FormField>
                </div>
              </TabsContent>

              {/* Academic Details Tab */}
              <TabsContent value="academic" className="mt-0 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField label="Student Population">
                    <Input
                      type="number"
                      placeholder="e.g., 1000"
                      value={formData.studentPopulation || ""}
                      onChange={(e) => setFormData({ ...formData, studentPopulation: Number.parseInt(e.target.value) })}
                    />
                  </FormField>

                  <FormField label="Teacher-Student Ratio">
                    <Input
                      placeholder="e.g., 1:8"
                      value={formData.teacherStudentRatio || ""}
                      onChange={(e) => setFormData({ ...formData, teacherStudentRatio: e.target.value })}
                    />
                  </FormField>

                  <FormField label="Average Class Size">
                    <Input
                      type="number"
                      placeholder="e.g., 15"
                      value={formData.averageClassSize || ""}
                      onChange={(e) => setFormData({ ...formData, averageClassSize: Number.parseInt(e.target.value) })}
                    />
                  </FormField>

                  <FormField label="Age Range">
                    <Input
                      placeholder="e.g., 11-18"
                      value={formData.ageRange || ""}
                      onChange={(e) => setFormData({ ...formData, ageRange: e.target.value })}
                    />
                  </FormField>
                </div>

                <div className="space-y-4">
                  <CheckboxGroup
                    label="Curriculum Offered"
                    options={["GCSE", "A-Level", "IB", "Pre-U", "AP"]}
                    selected={curriculum}
                    onChange={(item) => toggleArrayItem(curriculum, setCurriculum, item)}
                  />

                  <CheckboxGroup
                    label="School Levels"
                    options={["Prep", "Primary", "Secondary", "Sixth Form"]}
                    selected={schoolLevels}
                    onChange={(item) => toggleArrayItem(schoolLevels, setSchoolLevels, item)}
                  />

                  <CheckboxGroup
                    label="Exam Boards"
                    options={["OCR", "AQA", "Edexcel", "Cambridge", "IB"]}
                    selected={examBoards}
                    onChange={(item) => toggleArrayItem(examBoards, setExamBoards, item)}
                  />

                  <CheckboxGroup
                    label="Languages Offered"
                    options={["French", "German", "Spanish", "Mandarin", "Italian", "Russian", "Japanese", "Latin"]}
                    selected={languages}
                    onChange={(item) => toggleArrayItem(languages, setLanguages, item)}
                  />
                </div>
              </TabsContent>

              {/* Admissions & Fees Tab */}
              <TabsContent value="admissions" className="mt-0 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField label="Day Student Fees (Per Term)">
                    <Input
                      placeholder="e.g., £8,950"
                      value={formData.feesPerTerm?.day || ""}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          feesPerTerm: { ...formData.feesPerTerm, day: e.target.value },
                        })
                      }
                    />
                  </FormField>

                  <FormField label="Boarding Fees (Per Term)">
                    <Input
                      placeholder="e.g., £14,640"
                      value={formData.feesPerTerm?.boarding || ""}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          feesPerTerm: { ...formData.feesPerTerm, boarding: e.target.value },
                        })
                      }
                    />
                  </FormField>

                  <FormField label="International Fees (Per Term)">
                    <Input
                      placeholder="e.g., £15,910"
                      value={formData.feesPerTerm?.international || ""}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          feesPerTerm: { ...formData.feesPerTerm, international: e.target.value },
                        })
                      }
                    />
                  </FormField>

                  <FormField label="Entry Points">
                    <Input
                      placeholder="e.g., 11+, 13+, 16+ (comma separated)"
                      value={formData.entryPoints?.join(", ") || ""}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          entryPoints: e.target.value.split(",").map((s) => s.trim()),
                        })
                      }
                    />
                  </FormField>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="scholarships"
                    checked={formData.scholarships}
                    onCheckedChange={(checked) => setFormData({ ...formData, scholarships: checked as boolean })}
                  />
                  <Label htmlFor="scholarships" className="text-sm font-medium cursor-pointer">
                    Scholarships Available
                  </Label>
                </div>
              </TabsContent>

              {/* Facilities & Activities Tab */}
              <TabsContent value="facilities" className="mt-0 space-y-6">
                <CheckboxGroup
                  label="Facilities"
                  options={[
                    "Library",
                    "Science Labs",
                    "Sports Hall",
                    "Swimming Pool",
                    "Theatre",
                    "Music School",
                    "Art Gallery",
                    "Computer Labs",
                    "Chapel",
                    "Medical Centre",
                  ]}
                  selected={facilities}
                  onChange={(item) => toggleArrayItem(facilities, setFacilities, item)}
                />

                <CheckboxGroup
                  label="Sports"
                  options={[
                    "Football",
                    "Rugby",
                    "Cricket",
                    "Tennis",
                    "Hockey",
                    "Swimming",
                    "Athletics",
                    "Rowing",
                    "Basketball",
                    "Netball",
                  ]}
                  selected={sports}
                  onChange={(item) => toggleArrayItem(sports, setSports, item)}
                />

                <CheckboxGroup
                  label="Extracurricular Activities"
                  options={[
                    "Drama",
                    "Music",
                    "Art",
                    "Debating",
                    "Chess",
                    "Robotics",
                    "CCF",
                    "Duke of Edinburgh",
                    "Model UN",
                    "Community Service",
                  ]}
                  selected={extracurricular}
                  onChange={(item) => toggleArrayItem(extracurricular, setExtracurricular, item)}
                />
              </TabsContent>

              {/* Contacts Tab */}
              <TabsContent value="contacts" className="mt-0 space-y-6">
                <div className="flex items-center justify-between mb-4">
                  <p className="text-sm text-gray-600">Add school contact persons</p>
                  <Button type="button" variant="outline" size="sm" onClick={addContact}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Contact
                  </Button>
                </div>

                {contacts.length === 0 && (
                  <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                    <p className="text-gray-600">No contacts added yet</p>
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
                        <CardDescription>School staff member</CardDescription>
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
                        <FormField label="Name" required>
                          <Input
                            placeholder="Enter name"
                            value={contact.name}
                            onChange={(e) => updateContact(index, "name", e.target.value)}
                          />
                        </FormField>

                        <FormField label="Position" required>
                          <Input
                            placeholder="e.g., Admissions Director"
                            value={contact.position}
                            onChange={(e) => updateContact(index, "position", e.target.value)}
                          />
                        </FormField>

                        <FormField label="Email" required>
                          <Input
                            type="email"
                            placeholder="email@school.com"
                            value={contact.email}
                            onChange={(e) => updateContact(index, "email", e.target.value)}
                          />
                        </FormField>

                        <FormField label="Telephone" required>
                          <Input
                            placeholder="Enter telephone"
                            value={contact.telephone}
                            onChange={(e) => updateContact(index, "telephone", e.target.value)}
                          />
                        </FormField>

                        <FormField label="Mobile">
                          <Input
                            placeholder="Enter mobile"
                            value={contact.mobile}
                            onChange={(e) => updateContact(index, "mobile", e.target.value)}
                          />
                        </FormField>

                        <div className="flex items-center space-x-2 mt-6">
                          <Checkbox
                            id={`primary-${index}`}
                            checked={contact.isPrimary}
                            onCheckedChange={(checked) => updateContact(index, "isPrimary", checked as boolean)}
                          />
                          <Label htmlFor={`primary-${index}`} className="text-sm font-medium cursor-pointer">
                            Primary Contact
                          </Label>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </TabsContent>

              {/* Partnership Tab */}
              <TabsContent value="partnership" className="mt-0 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField label="Partnership Status" required>
                    <Select
                      value={formData.status}
                      onValueChange={(value) =>
                        setFormData({ ...formData, status: value as "Active" | "Inactive" | "Partner" })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Active">Active</SelectItem>
                        <SelectItem value="Partner">Partner</SelectItem>
                        <SelectItem value="Inactive">Inactive</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormField>

                  <FormField label="Partner Since">
                    <Input
                      placeholder="e.g., 2010"
                      value={formData.partnerSince || ""}
                      onChange={(e) => setFormData({ ...formData, partnerSince: e.target.value })}
                    />
                  </FormField>

                  <FormField label="Last Visit Date">
                    <Input
                      type="date"
                      value={formData.lastVisit || ""}
                      onChange={(e) => setFormData({ ...formData, lastVisit: e.target.value })}
                    />
                  </FormField>

                  <FormField label="Notes" fullWidth>
                    <Textarea
                      placeholder="Enter any partnership notes, remarks, or special instructions"
                      rows={4}
                      value={formData.notes || ""}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    />
                  </FormField>
                </div>
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
          {mode === "create" ? "Create School" : "Save Changes"}
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

function CheckboxGroup({
  label,
  options,
  selected,
  onChange,
}: {
  label: string
  options: string[]
  selected: string[]
  onChange: (item: string) => void
}) {
  return (
    <div>
      <Label className="text-sm font-medium text-gray-700 mb-3 block">{label}</Label>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {options.map((option) => (
          <div key={option} className="flex items-center space-x-2">
            <Checkbox id={option} checked={selected.includes(option)} onCheckedChange={() => onChange(option)} />
            <Label htmlFor={option} className="text-sm font-normal cursor-pointer">
              {option}
            </Label>
          </div>
        ))}
      </div>
    </div>
  )
}
