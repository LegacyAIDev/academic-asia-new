"use client"

import type React from "react"

import { useState } from "react"
import { ArrowLeft, Printer, Mail, FileText, Calendar, Pencil } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import Link from "next/link"
import { DUMMY_STUDENT } from "@/lib/dummy-data/students"
import { getApplicationsByStudent } from "@/lib/dummy-data/applications"
import { BasicInfoTab } from "./profile-tabs/basic-info-tab"
import { SchoolApplicationTab } from "./profile-tabs/school-application-tab"
import { ContactTab } from "./profile-tabs/contact-tab"

interface StudentProfileViewProps {
  studentId: string
}

export function StudentProfileView({ studentId }: StudentProfileViewProps) {
  const [activeTab, setActiveTab] = useState("basic-info")
  const student = DUMMY_STUDENT // In real app, fetch by studentId
  const applications = getApplicationsByStudent(studentId)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/students">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Student Details - {student.name}</h1>
            <p className="text-sm text-gray-500 mt-1">
              Home /{" "}
              <Link href="/students" className="hover:text-blue-600">
                Students
              </Link>{" "}
              / <span className="text-gray-700">{student.name}</span>
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="outline" size="sm" asChild>
            <Link href={`/students/${studentId}/edit`}>
              <Pencil className="h-4 w-4 mr-2" />
              Edit
            </Link>
          </Button>
          <Button variant="outline" size="sm">
            <Printer className="h-4 w-4 mr-2" />
            Print
          </Button>
          <Button variant="outline" size="sm">
            <Mail className="h-4 w-4 mr-2" />
            Email
          </Button>
          <Button variant="outline" size="sm">
            <FileText className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Student Summary Card */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-start space-x-6">
            <Avatar className="h-24 w-24">
              <AvatarFallback className="text-2xl bg-blue-100 text-blue-600">
                {student.firstname.substring(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 grid grid-cols-2 md:grid-cols-4 gap-6">
              <div>
                <p className="text-xs text-gray-500 mb-1">Student ID</p>
                <p className="font-mono font-semibold text-gray-900">{student.id}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">AA Ref</p>
                <p className="font-mono font-semibold text-gray-900">{student.aaRef}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">Chinese Name</p>
                <p className="font-semibold text-gray-900">{student.chineseName}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">Case Status</p>
                <Badge className="bg-green-50 text-green-700 border-green-200">{student.case}</Badge>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">Year Apply</p>
                <p className="font-semibold text-gray-900">{student.yearApply}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">Entry Year</p>
                <p className="font-semibold text-gray-900">{student.entryYear}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">Officer</p>
                <p className="font-semibold text-gray-900">{student.officer}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">Enroll Date</p>
                <p className="font-semibold text-gray-900">{student.enrollDate}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Card>
        <CardContent className="p-0">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <div className="border-b border-gray-200 px-6">
              <TabsList className="h-auto p-0 bg-transparent">
                <TabsTrigger
                  value="basic-info"
                  className="rounded-none border-b-2 border-transparent data-[state=active]:border-blue-600 data-[state=active]:bg-transparent px-4 py-3"
                >
                  Basic Info
                </TabsTrigger>
                <TabsTrigger
                  value="school-application"
                  className="rounded-none border-b-2 border-transparent data-[state=active]:border-blue-600 data-[state=active]:bg-transparent px-4 py-3"
                >
                  School Application
                </TabsTrigger>
                <TabsTrigger
                  value="education"
                  className="rounded-none border-b-2 border-transparent data-[state=active]:border-blue-600 data-[state=active]:bg-transparent px-4 py-3"
                >
                  Education
                </TabsTrigger>
                <TabsTrigger
                  value="visa"
                  className="rounded-none border-b-2 border-transparent data-[state=active]:border-blue-600 data-[state=active]:bg-transparent px-4 py-3"
                >
                  Visa
                </TabsTrigger>
                <TabsTrigger
                  value="contact"
                  className="rounded-none border-b-2 border-transparent data-[state=active]:border-blue-600 data-[state=active]:bg-transparent px-4 py-3"
                >
                  Contact
                </TabsTrigger>
                <TabsTrigger
                  value="test"
                  className="rounded-none border-b-2 border-transparent data-[state=active]:border-blue-600 data-[state=active]:bg-transparent px-4 py-3"
                >
                  Test / Exam Result
                </TabsTrigger>
                <TabsTrigger
                  value="documents"
                  className="rounded-none border-b-2 border-transparent data-[state=active]:border-blue-600 data-[state=active]:bg-transparent px-4 py-3"
                >
                  Document
                </TabsTrigger>
              </TabsList>
            </div>

            <div className="p-6">
              <TabsContent value="basic-info" className="mt-0">
                <BasicInfoTab student={student} />
              </TabsContent>

              <TabsContent value="school-application" className="mt-0">
                <SchoolApplicationTab applications={applications} />
              </TabsContent>

              <TabsContent value="education" className="mt-0">
                <PlaceholderTabContent
                  icon={<Calendar className="h-12 w-12 text-blue-500" />}
                  title="Education History"
                  description="Education history and qualifications will be displayed here"
                />
              </TabsContent>

              <TabsContent value="visa" className="mt-0">
                <PlaceholderTabContent
                  icon={<FileText className="h-12 w-12 text-blue-500" />}
                  title="Visa Information"
                  description="Visa details and application status will be displayed here"
                />
              </TabsContent>

              <TabsContent value="contact" className="mt-0">
                <ContactTab student={student} />
              </TabsContent>

              <TabsContent value="test" className="mt-0">
                <PlaceholderTabContent
                  icon={<FileText className="h-12 w-12 text-blue-500" />}
                  title="Test & Exam Results"
                  description="Test scores and exam results will be displayed here"
                />
              </TabsContent>

              <TabsContent value="documents" className="mt-0">
                <PlaceholderTabContent
                  icon={<FileText className="h-12 w-12 text-blue-500" />}
                  title="Documents"
                  description="Uploaded documents and files will be displayed here"
                />
              </TabsContent>
            </div>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}

function PlaceholderTabContent({
  icon,
  title,
  description,
}: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="mb-4">{icon}</div>
      <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
      <p className="text-gray-600 max-w-md">{description}</p>
    </div>
  )
}
