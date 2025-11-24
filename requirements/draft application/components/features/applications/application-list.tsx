"use client"

import { useState } from "react"
import { Plus, Search, Filter, Download, Eye, Pencil, Trash2, Calendar } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import Link from "next/link"
import { DUMMY_APPLICATIONS } from "@/lib/dummy-data/applications"

export function ApplicationList() {
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")

  const filteredApplications = DUMMY_APPLICATIONS.filter((app) => {
    const matchesSearch =
      app.studentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      app.schoolName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      app.id.toLowerCase().includes(searchQuery.toLowerCase())

    const matchesStatus = statusFilter === "all" || app.enrolStatus === statusFilter

    return matchesSearch && matchesStatus
  })

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Offered":
        return "bg-green-50 text-green-700 border-green-200"
      case "Proceed":
        return "bg-blue-50 text-blue-700 border-blue-200"
      case "Awaiting Interview":
        return "bg-yellow-50 text-yellow-700 border-yellow-200"
      case "Cannot Proceed":
        return "bg-red-50 text-red-700 border-red-200"
      case "Withdrawn":
        return "bg-gray-50 text-gray-700 border-gray-200"
      case "Enrolled":
        return "bg-purple-50 text-purple-700 border-purple-200"
      default:
        return "bg-gray-50 text-gray-700 border-gray-200"
    }
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">All Applications</h1>
          <p className="text-sm text-gray-500 mt-1">
            Home / <span className="text-gray-700">Applications</span>
          </p>
        </div>
        <Button className="bg-blue-600 hover:bg-blue-700" asChild>
          <Link href="/applications/new">
            <Plus className="h-4 w-4 mr-2" />
            New Application
          </Link>
        </Button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="relative col-span-2">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Search by student, school, or application ID"
              className="pl-10"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="Awaiting Interview">Awaiting Interview</SelectItem>
              <SelectItem value="Proceed">Proceed</SelectItem>
              <SelectItem value="Offered">Offered</SelectItem>
              <SelectItem value="Cannot Proceed">Cannot Proceed</SelectItem>
              <SelectItem value="Withdrawn">Withdrawn</SelectItem>
              <SelectItem value="Enrolled">Enrolled</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-xs text-gray-500 mb-1">Total Applications</p>
          <p className="text-2xl font-bold text-gray-900">{DUMMY_APPLICATIONS.length}</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-xs text-gray-500 mb-1">Awaiting Interview</p>
          <p className="text-2xl font-bold text-yellow-600">
            {DUMMY_APPLICATIONS.filter((a) => a.enrolStatus === "Awaiting Interview").length}
          </p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-xs text-gray-500 mb-1">Offers Received</p>
          <p className="text-2xl font-bold text-green-600">
            {DUMMY_APPLICATIONS.filter((a) => a.enrolStatus === "Offered").length}
          </p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-xs text-gray-500 mb-1">In Progress</p>
          <p className="text-2xl font-bold text-blue-600">
            {DUMMY_APPLICATIONS.filter((a) => a.enrolStatus === "Proceed").length}
          </p>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg border border-gray-200">
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <span className="text-sm text-gray-700">Showing {filteredApplications.length} applications</span>
          <div className="flex items-center space-x-2">
            <Button variant="ghost" size="sm">
              <Filter className="h-4 w-4 mr-2" />
              Filter
            </Button>
            <Button variant="ghost" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Application ID</TableHead>
                <TableHead>Student</TableHead>
                <TableHead>School</TableHead>
                <TableHead>Year Apply</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Sub-Status</TableHead>
                <TableHead>Event/Interview</TableHead>
                <TableHead>Officer</TableHead>
                <TableHead className="w-24">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredApplications.map((app) => (
                <TableRow key={app.id} className="hover:bg-gray-50">
                  <TableCell className="font-mono text-sm">{app.id}</TableCell>
                  <TableCell>
                    <Link href={`/students/${app.studentId}`} className="font-medium text-blue-600 hover:underline">
                      {app.studentName}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <Link href={`/schools/${app.schoolId}`} className="text-gray-900 hover:text-blue-600">
                      {app.schoolName}
                    </Link>
                  </TableCell>
                  <TableCell className="text-sm text-gray-600">{app.yearApply}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={getStatusColor(app.enrolStatus)}>
                      {app.enrolStatus}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-gray-600">{app.subEnrolStatus || "-"}</TableCell>
                  <TableCell>
                    {app.eventDate ? (
                      <div className="flex items-center space-x-1 text-sm text-gray-600">
                        <Calendar className="h-3 w-3" />
                        <span>{app.eventDate}</span>
                      </div>
                    ) : (
                      <span className="text-sm text-gray-400">Not scheduled</span>
                    )}
                  </TableCell>
                  <TableCell className="text-sm text-gray-600">{app.assignedOfficer}</TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-1">
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0" asChild>
                        <Link href={`/applications/${app.id}`}>
                          <Eye className="h-4 w-4" />
                        </Link>
                      </Button>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0" asChild>
                        <Link href={`/applications/${app.id}/edit`}>
                          <Pencil className="h-4 w-4" />
                        </Link>
                      </Button>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-red-600 hover:text-red-700">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  )
}
