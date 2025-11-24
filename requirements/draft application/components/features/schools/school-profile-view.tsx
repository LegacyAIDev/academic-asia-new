"use client"

import type React from "react"

import { useState } from "react"
import { ArrowLeft, Pencil, Mail, Phone, Globe, MapPin, Users, Calendar, Award, Building2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"
import { DUMMY_SCHOOLS, DUMMY_SCHOOL_CONTACTS } from "@/lib/dummy-data/schools"

interface SchoolProfileViewProps {
  schoolId: string
}

export function SchoolProfileView({ schoolId }: SchoolProfileViewProps) {
  const [activeTab, setActiveTab] = useState("overview")
  const school = DUMMY_SCHOOLS.find((s) => s.id === schoolId) || DUMMY_SCHOOLS[0]
  const contacts = DUMMY_SCHOOL_CONTACTS[schoolId] || []

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/schools">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{school.schoolName}</h1>
            <p className="text-sm text-gray-500 mt-1">
              Home /{" "}
              <Link href="/schools" className="hover:text-blue-600">
                Schools
              </Link>{" "}
              / <span className="text-gray-700">{school.shortName}</span>
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="outline" size="sm" asChild>
            <Link href={`/schools/${schoolId}/edit`}>
              <Pencil className="h-4 w-4 mr-2" />
              Edit
            </Link>
          </Button>
          <Button variant="outline" size="sm" asChild>
            <a href={`https://${school.website}`} target="_blank" rel="noopener noreferrer">
              <Globe className="h-4 w-4 mr-2" />
              Website
            </a>
          </Button>
        </div>
      </div>

      {/* School Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-3">
              <div className="bg-blue-100 p-3 rounded-lg">
                <Users className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-xs text-gray-500">Total Applications</p>
                <p className="text-2xl font-bold text-gray-900">{school.totalApplications}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-3">
              <div className="bg-green-100 p-3 rounded-lg">
                <Award className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-xs text-gray-500">Successful Placements</p>
                <p className="text-2xl font-bold text-gray-900">{school.successfulPlacements}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-3">
              <div className="bg-purple-100 p-3 rounded-lg">
                <Calendar className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-xs text-gray-500">Interviews Scheduled</p>
                <p className="text-2xl font-bold text-gray-900">{school.interviewsScheduled}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-3">
              <div className="bg-orange-100 p-3 rounded-lg">
                <Building2 className="h-5 w-5 text-orange-600" />
              </div>
              <div>
                <p className="text-xs text-gray-500">Student Population</p>
                <p className="text-2xl font-bold text-gray-900">{school.studentPopulation}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Card>
        <CardContent className="p-0">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <div className="border-b border-gray-200 px-6">
              <TabsList className="h-auto p-0 bg-transparent">
                <TabsTrigger
                  value="overview"
                  className="rounded-none border-b-2 border-transparent data-[state=active]:border-blue-600 data-[state=active]:bg-transparent px-4 py-3"
                >
                  Overview
                </TabsTrigger>
                <TabsTrigger
                  value="academic"
                  className="rounded-none border-b-2 border-transparent data-[state=active]:border-blue-600 data-[state=active]:bg-transparent px-4 py-3"
                >
                  Academic
                </TabsTrigger>
                <TabsTrigger
                  value="admissions"
                  className="rounded-none border-b-2 border-transparent data-[state=active]:border-blue-600 data-[state=active]:bg-transparent px-4 py-3"
                >
                  Admissions
                </TabsTrigger>
                <TabsTrigger
                  value="facilities"
                  className="rounded-none border-b-2 border-transparent data-[state=active]:border-blue-600 data-[state=active]:bg-transparent px-4 py-3"
                >
                  Facilities
                </TabsTrigger>
                <TabsTrigger
                  value="contacts"
                  className="rounded-none border-b-2 border-transparent data-[state=active]:border-blue-600 data-[state=active]:bg-transparent px-4 py-3"
                >
                  Contacts
                </TabsTrigger>
                <TabsTrigger
                  value="applications"
                  className="rounded-none border-b-2 border-transparent data-[state=active]:border-blue-600 data-[state=active]:bg-transparent px-4 py-3"
                >
                  Applications
                </TabsTrigger>
              </TabsList>
            </div>

            <div className="p-6">
              {/* Overview Tab */}
              <TabsContent value="overview" className="mt-0 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Card className="bg-gray-50/50">
                    <CardHeader>
                      <CardTitle className="text-base">Basic Information</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <InfoRow label="School ID" value={school.id} />
                      <InfoRow label="Short Name" value={school.shortName} />
                      <InfoRow label="Founded" value={school.founded} />
                      <InfoRow label="School Type" value={school.schoolType} />
                      <InfoRow label="Boarding Type" value={school.boardingType} />
                      <InfoRow label="Religious Affiliation" value={school.religiousAffiliation} />
                      <InfoRow label="Headmaster" value={school.headmaster} />
                    </CardContent>
                  </Card>

                  <Card className="bg-gray-50/50">
                    <CardHeader>
                      <CardTitle className="text-base">Location & Contact</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex items-start space-x-2">
                        <MapPin className="h-4 w-4 text-gray-400 mt-1" />
                        <div className="flex-1">
                          <p className="text-xs text-gray-500">Address</p>
                          <p className="text-sm text-gray-900">{school.address}</p>
                          <p className="text-sm text-gray-900">{school.postcode}</p>
                          <p className="text-sm text-gray-600">
                            {school.city}, {school.country}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Phone className="h-4 w-4 text-gray-400" />
                        <div className="flex-1">
                          <p className="text-xs text-gray-500">Telephone</p>
                          <a href={`tel:${school.telephone}`} className="text-sm text-blue-600 hover:underline">
                            {school.telephone}
                          </a>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Mail className="h-4 w-4 text-gray-400" />
                        <div className="flex-1">
                          <p className="text-xs text-gray-500">Email</p>
                          <a href={`mailto:${school.email}`} className="text-sm text-blue-600 hover:underline">
                            {school.email}
                          </a>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Globe className="h-4 w-4 text-gray-400" />
                        <div className="flex-1">
                          <p className="text-xs text-gray-500">Website</p>
                          <a
                            href={`https://${school.website}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-blue-600 hover:underline"
                          >
                            {school.website}
                          </a>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="bg-gray-50/50">
                    <CardHeader>
                      <CardTitle className="text-base">Partnership Status</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <InfoRow
                        label="Status"
                        value={
                          <Badge
                            variant="outline"
                            className={
                              school.status === "Active"
                                ? "bg-green-50 text-green-700 border-green-200"
                                : school.status === "Partner"
                                  ? "bg-blue-50 text-blue-700 border-blue-200"
                                  : "bg-gray-50 text-gray-700 border-gray-200"
                            }
                          >
                            {school.status}
                          </Badge>
                        }
                      />
                      {school.partnerSince && <InfoRow label="Partner Since" value={school.partnerSince} />}
                      {school.lastVisit && <InfoRow label="Last Visit" value={school.lastVisit} />}
                      {school.notes && (
                        <div>
                          <p className="text-xs text-gray-500 mb-1">Notes</p>
                          <p className="text-sm text-gray-900 bg-white p-3 rounded border border-gray-200">
                            {school.notes}
                          </p>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  <Card className="bg-gray-50/50">
                    <CardHeader>
                      <CardTitle className="text-base">Quick Stats</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <InfoRow label="Student Population" value={school.studentPopulation.toLocaleString()} />
                      <InfoRow label="Teacher-Student Ratio" value={school.teacherStudentRatio} />
                      <InfoRow label="Average Class Size" value={school.averageClassSize.toString()} />
                      <InfoRow label="Age Range" value={school.ageRange} />
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              {/* Academic Tab */}
              <TabsContent value="academic" className="mt-0 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Card className="bg-gray-50/50">
                    <CardHeader>
                      <CardTitle className="text-base">Curriculum & Exams</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <p className="text-xs text-gray-500 mb-2">Curriculum Offered</p>
                        <div className="flex flex-wrap gap-2">
                          {school.curriculum.map((curr) => (
                            <Badge key={curr} variant="outline" className="bg-white">
                              {curr}
                            </Badge>
                          ))}
                        </div>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 mb-2">Exam Boards</p>
                        <div className="flex flex-wrap gap-2">
                          {school.examBoards.map((board) => (
                            <Badge key={board} variant="outline" className="bg-white">
                              {board}
                            </Badge>
                          ))}
                        </div>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 mb-2">School Levels</p>
                        <div className="flex flex-wrap gap-2">
                          {school.schoolLevel.map((level) => (
                            <Badge key={level} variant="outline" className="bg-white">
                              {level}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="bg-gray-50/50">
                    <CardHeader>
                      <CardTitle className="text-base">Languages</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-xs text-gray-500 mb-2">Languages Offered</p>
                      <div className="flex flex-wrap gap-2">
                        {school.languagesOffered.map((lang) => (
                          <Badge key={lang} variant="outline" className="bg-white">
                            {lang}
                          </Badge>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              {/* Admissions Tab */}
              <TabsContent value="admissions" className="mt-0 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Card className="bg-gray-50/50">
                    <CardHeader>
                      <CardTitle className="text-base">Entry Requirements</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <InfoRow label="Age Range" value={school.ageRange} />
                      <div>
                        <p className="text-xs text-gray-500 mb-2">Entry Points</p>
                        <div className="flex flex-wrap gap-2">
                          {school.entryPoints.map((point) => (
                            <Badge key={point} variant="outline" className="bg-white">
                              {point}
                            </Badge>
                          ))}
                        </div>
                      </div>
                      <InfoRow
                        label="Scholarships Available"
                        value={school.scholarships ? "Yes" : "No"}
                        highlight={school.scholarships}
                      />
                    </CardContent>
                  </Card>

                  <Card className="bg-gray-50/50">
                    <CardHeader>
                      <CardTitle className="text-base">Fees (Per Term)</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {school.feesPerTerm.day && <InfoRow label="Day Student" value={school.feesPerTerm.day} />}
                      {school.feesPerTerm.boarding && <InfoRow label="Boarding" value={school.feesPerTerm.boarding} />}
                      {school.feesPerTerm.international && (
                        <InfoRow label="International" value={school.feesPerTerm.international} />
                      )}
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              {/* Facilities Tab */}
              <TabsContent value="facilities" className="mt-0 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <Card className="bg-gray-50/50">
                    <CardHeader>
                      <CardTitle className="text-base">Facilities</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-2">
                        {school.facilities.map((facility) => (
                          <li key={facility} className="text-sm text-gray-700 flex items-center">
                            <span className="w-2 h-2 bg-blue-600 rounded-full mr-2"></span>
                            {facility}
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>

                  <Card className="bg-gray-50/50">
                    <CardHeader>
                      <CardTitle className="text-base">Sports</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-2">
                        {school.sports.map((sport) => (
                          <li key={sport} className="text-sm text-gray-700 flex items-center">
                            <span className="w-2 h-2 bg-green-600 rounded-full mr-2"></span>
                            {sport}
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>

                  <Card className="bg-gray-50/50">
                    <CardHeader>
                      <CardTitle className="text-base">Extracurricular</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-2">
                        {school.extracurricular.map((activity) => (
                          <li key={activity} className="text-sm text-gray-700 flex items-center">
                            <span className="w-2 h-2 bg-purple-600 rounded-full mr-2"></span>
                            {activity}
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              {/* Contacts Tab */}
              <TabsContent value="contacts" className="mt-0 space-y-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">School Contacts</h3>
                  <Button size="sm">Add Contact</Button>
                </div>

                {contacts.length === 0 ? (
                  <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                    <p className="text-gray-600">No contacts added for this school</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {contacts.map((contact) => (
                      <Card key={contact.id} className={contact.isPrimary ? "border-blue-200 bg-blue-50/30" : ""}>
                        <CardContent className="p-6">
                          <div className="flex items-start justify-between mb-3">
                            <div>
                              <h4 className="font-semibold text-gray-900">{contact.name}</h4>
                              <p className="text-sm text-gray-600">{contact.position}</p>
                            </div>
                            {contact.isPrimary && (
                              <Badge variant="outline" className="bg-blue-100 text-blue-700 border-blue-200">
                                Primary
                              </Badge>
                            )}
                          </div>
                          <div className="space-y-2">
                            <div className="flex items-center space-x-2 text-sm">
                              <Mail className="h-4 w-4 text-gray-400" />
                              <a href={`mailto:${contact.email}`} className="text-blue-600 hover:underline">
                                {contact.email}
                              </a>
                            </div>
                            <div className="flex items-center space-x-2 text-sm">
                              <Phone className="h-4 w-4 text-gray-400" />
                              <a href={`tel:${contact.telephone}`} className="text-gray-700">
                                {contact.telephone}
                              </a>
                            </div>
                            {contact.mobile && (
                              <div className="flex items-center space-x-2 text-sm">
                                <Phone className="h-4 w-4 text-gray-400" />
                                <a href={`tel:${contact.mobile}`} className="text-gray-700">
                                  {contact.mobile}
                                </a>
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </TabsContent>

              {/* Applications Tab */}
              <TabsContent value="applications" className="mt-0">
                <div className="text-center py-12 bg-gray-50 rounded-lg">
                  <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Student Applications</h3>
                  <p className="text-gray-600 mb-4">View all student applications to this school</p>
                  <Button variant="outline">View Applications</Button>
                </div>
              </TabsContent>
            </div>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}

function InfoRow({
  label,
  value,
  highlight,
}: {
  label: string
  value: string | React.ReactNode
  highlight?: boolean
}) {
  return (
    <div className="flex justify-between items-start text-sm">
      <span className="text-gray-600 font-medium min-w-[140px]">{label}:</span>
      <span className={`text-right flex-1 ${highlight ? "font-semibold text-blue-600" : "text-gray-900"}`}>
        {value}
      </span>
    </div>
  )
}
