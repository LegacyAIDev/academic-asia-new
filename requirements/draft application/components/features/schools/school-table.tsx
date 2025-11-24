"use client"

import { useState } from "react"
import {
  Plus,
  Search,
  Filter,
  Download,
  MoreHorizontal,
  Pencil,
  Trash2,
  Eye,
  MapPin,
  Phone,
  Mail,
  Globe,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import Link from "next/link"
import { DUMMY_SCHOOLS } from "@/lib/dummy-data/schools"

export function SchoolTable() {
  const [selectedSchools, setSelectedSchools] = useState<string[]>([])
  const [searchQuery, setSearchQuery] = useState("")

  const toggleSchool = (id: string) => {
    setSelectedSchools((prev) => (prev.includes(id) ? prev.filter((sid) => sid !== id) : [...prev, id]))
  }

  const toggleAll = () => {
    if (selectedSchools.length === DUMMY_SCHOOLS.length) {
      setSelectedSchools([])
    } else {
      setSelectedSchools(DUMMY_SCHOOLS.map((s) => s.id))
    }
  }

  const filteredSchools = DUMMY_SCHOOLS.filter(
    (school) =>
      school.schoolName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      school.city.toLowerCase().includes(searchQuery.toLowerCase()) ||
      school.country.toLowerCase().includes(searchQuery.toLowerCase()),
  )

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">All Schools</h1>
          <p className="text-sm text-gray-500 mt-1">
            Home / <span className="text-gray-700">Schools</span>
          </p>
        </div>
        <Button className="bg-blue-600 hover:bg-blue-700" asChild>
          <Link href="/schools/new">
            <Plus className="h-4 w-4 mr-2" />
            Add School
          </Link>
        </Button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-gray-900">School Search</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="relative col-span-2">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Search by school name, city, or country"
              className="pl-10"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <Select>
            <SelectTrigger>
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="partner">Partner</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
            </SelectContent>
          </Select>
          <Select>
            <SelectTrigger>
              <SelectValue placeholder="Country" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Countries</SelectItem>
              <SelectItem value="uk">United Kingdom</SelectItem>
              <SelectItem value="usa">United States</SelectItem>
              <SelectItem value="canada">Canada</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg border border-gray-200">
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <span className="text-sm text-gray-700">
              {selectedSchools.length > 0
                ? `${selectedSchools.length} selected`
                : `Total Schools: ${filteredSchools.length}`}
            </span>
            {selectedSchools.length > 0 && (
              <>
                <div className="h-4 w-px bg-gray-300" />
                <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-700 hover:bg-red-50">
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </Button>
              </>
            )}
          </div>
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
                <TableHead className="w-12">
                  <Checkbox checked={selectedSchools.length === filteredSchools.length} onCheckedChange={toggleAll} />
                </TableHead>
                <TableHead>School</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Boarding</TableHead>
                <TableHead>Age Range</TableHead>
                <TableHead>Applications</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead className="w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredSchools.map((school) => (
                <TableRow key={school.id} className="hover:bg-gray-50">
                  <TableCell>
                    <Checkbox
                      checked={selectedSchools.includes(school.id)}
                      onCheckedChange={() => toggleSchool(school.id)}
                    />
                  </TableCell>
                  <TableCell>
                    <div>
                      <Link href={`/schools/${school.id}`} className="font-medium text-gray-900 hover:text-blue-600">
                        {school.schoolName}
                      </Link>
                      <div className="text-xs text-gray-500">{school.id}</div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-start space-x-2">
                      <MapPin className="h-4 w-4 text-gray-400 mt-0.5 flex-shrink-0" />
                      <div className="text-sm">
                        <div className="text-gray-900">{school.city}</div>
                        <div className="text-xs text-gray-500">{school.country}</div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-gray-600">{school.schoolType}</TableCell>
                  <TableCell className="text-sm text-gray-600">{school.boardingType}</TableCell>
                  <TableCell className="text-sm text-gray-600">{school.ageRange}</TableCell>
                  <TableCell>
                    <div className="text-sm">
                      <div className="font-medium text-gray-900">{school.totalApplications}</div>
                      <div className="text-xs text-gray-500">{school.successfulPlacements} placed</div>
                    </div>
                  </TableCell>
                  <TableCell>
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
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      <a
                        href={`mailto:${school.email}`}
                        className="text-gray-400 hover:text-blue-600"
                        title={school.email}
                      >
                        <Mail className="h-4 w-4" />
                      </a>
                      <a
                        href={`tel:${school.telephone}`}
                        className="text-gray-400 hover:text-blue-600"
                        title={school.telephone}
                      >
                        <Phone className="h-4 w-4" />
                      </a>
                      <a
                        href={`https://${school.website}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-gray-400 hover:text-blue-600"
                        title={school.website}
                      >
                        <Globe className="h-4 w-4" />
                      </a>
                    </div>
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem asChild>
                          <Link href={`/schools/${school.id}`} className="cursor-pointer">
                            <Eye className="h-4 w-4 mr-2" />
                            View Details
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link href={`/schools/${school.id}/edit`} className="cursor-pointer">
                            <Pencil className="h-4 w-4 mr-2" />
                            Edit
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="text-red-600">
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        <div className="flex items-center justify-between p-4 border-t border-gray-200">
          <div className="text-sm text-gray-600">
            Showing {filteredSchools.length} of {DUMMY_SCHOOLS.length} schools
          </div>
          <div className="flex items-center space-x-2">
            <Button variant="outline" size="sm" disabled>
              Previous
            </Button>
            <Button variant="outline" size="sm" className="bg-blue-600 text-white hover:bg-blue-700 border-blue-600">
              1
            </Button>
            <Button variant="outline" size="sm" disabled>
              Next
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
