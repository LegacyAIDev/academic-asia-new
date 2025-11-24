"use client"

import { useState } from "react"
import { Plus, Search, Filter, Download, MoreHorizontal, Pencil, Trash2, Eye } from "lucide-react"
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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import Link from "next/link"

const students = [
  {
    id: "S043033",
    name: "Jack HO",
    chineseName: "-",
    case: "Active",
    enrollDate: "12-SEP-2024",
    officer: "CHOW Hoi Sun Hayson",
    entryYear: "Sep-2026",
    address: "Flat D, 17/F, Tower 5, Monte...",
    passport: "HKSAR",
    gender: "M",
    yearApply: "Year 9",
    dob: "02-JAN-2013",
  },
  {
    id: "S043623",
    name: "Jack HO",
    chineseName: "-",
    case: "Active",
    enrollDate: "13-FEB-2023",
    officer: "CHOW Jamie Haole",
    entryYear: "Sep-2026",
    address: "Flat B, 29/F, Tower 15A, L...",
    passport: "British C",
    gender: "M",
    yearApply: "Year 9",
    dob: "16-AUG-2013",
  },
  {
    id: "S044751",
    name: "Jesse CHAN",
    chineseName: "劉韋鋒",
    case: "Active",
    enrollDate: "20-MAY-2024",
    officer: "LAU Waiyhan Wai Fung",
    entryYear: "Sep-2026",
    address: "Kent Court, 135, Boundary...",
    passport: "HKSAR",
    gender: "M",
    yearApply: "Year 10",
    dob: "20-JUL-2011",
  },
  {
    id: "S044850",
    name: "Jesse CHAN",
    chineseName: "姚俊亨",
    case: "New",
    enrollDate: "29-JUN-2024",
    officer: "YIU Hayden",
    entryYear: "Sep-2027",
    address: "16 Sau Wo Road, Shatin, N...",
    passport: "Canada",
    gender: "M",
    yearApply: "Year 9",
    dob: "28-JUN-2014",
  },
]

export function StudentTable() {
  const [selectedStudents, setSelectedStudents] = useState<string[]>([])
  const [showAdvancedSearch, setShowAdvancedSearch] = useState(false)
  const [showAddStudent, setShowAddStudent] = useState(false)

  const toggleStudent = (id: string) => {
    setSelectedStudents((prev) => (prev.includes(id) ? prev.filter((sid) => sid !== id) : [...prev, id]))
  }

  const toggleAll = () => {
    if (selectedStudents.length === students.length) {
      setSelectedStudents([])
    } else {
      setSelectedStudents(students.map((s) => s.id))
    }
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">All Students</h1>
          <p className="text-sm text-gray-500 mt-1">
            Home / <span className="text-gray-700">Students</span>
          </p>
        </div>
        <Button className="bg-blue-600 hover:bg-blue-700" onClick={() => setShowAddStudent(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Student
        </Button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-gray-900">Student Search</h2>
          <Button
            variant="ghost"
            size="sm"
            className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
            onClick={() => setShowAdvancedSearch(true)}
          >
            Advanced Search
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="relative col-span-2">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input placeholder="Search by name or ID" className="pl-10" />
          </div>
          <Select>
            <SelectTrigger>
              <SelectValue placeholder="Case Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="new">New</SelectItem>
              <SelectItem value="archived">Archived</SelectItem>
            </SelectContent>
          </Select>
          <Select>
            <SelectTrigger>
              <SelectValue placeholder="Entry Year" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Years</SelectItem>
              <SelectItem value="2026">2026</SelectItem>
              <SelectItem value="2027">2027</SelectItem>
              <SelectItem value="2028">2028</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg border border-gray-200">
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <span className="text-sm text-gray-700">
              {selectedStudents.length > 0
                ? `${selectedStudents.length} selected`
                : `Total Students: ${students.length}`}
            </span>
            {selectedStudents.length > 0 && (
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
                  <Checkbox checked={selectedStudents.length === students.length} onCheckedChange={toggleAll} />
                </TableHead>
                <TableHead>Student</TableHead>
                <TableHead>Student ID</TableHead>
                <TableHead>Case</TableHead>
                <TableHead>Enrol Date</TableHead>
                <TableHead>Officer</TableHead>
                <TableHead>Entry Year</TableHead>
                <TableHead>Address</TableHead>
                <TableHead>Passport</TableHead>
                <TableHead className="w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {students.map((student) => (
                <TableRow key={student.id} className="hover:bg-gray-50">
                  <TableCell>
                    <Checkbox
                      checked={selectedStudents.includes(student.id)}
                      onCheckedChange={() => toggleStudent(student.id)}
                    />
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-3">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src="/placeholder.svg?height=32&width=32" />
                        <AvatarFallback>{student.name.substring(0, 2)}</AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="font-medium text-gray-900">{student.name}</div>
                        <div className="text-xs text-gray-500">{student.chineseName}</div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="font-mono text-sm">{student.id}</TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={
                        student.case === "Active"
                          ? "bg-green-50 text-green-700 border-green-200"
                          : "bg-blue-50 text-blue-700 border-blue-200"
                      }
                    >
                      {student.case}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-gray-600">{student.enrollDate}</TableCell>
                  <TableCell className="text-sm text-gray-600">{student.officer}</TableCell>
                  <TableCell className="text-sm text-gray-600">{student.entryYear}</TableCell>
                  <TableCell className="text-sm text-gray-600 max-w-xs truncate">{student.address}</TableCell>
                  <TableCell className="text-sm text-gray-600">{student.passport}</TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem asChild>
                          <Link href={`/students/${student.id}`} className="cursor-pointer">
                            <Eye className="h-4 w-4 mr-2" />
                            View Details
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <Pencil className="h-4 w-4 mr-2" />
                          Edit
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
          <div className="text-sm text-gray-600">Showing 1 to 4 of 4 students</div>
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

      {/* Advanced Search Dialog */}
      <Dialog open={showAdvancedSearch} onOpenChange={setShowAdvancedSearch}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Advanced Student Search</DialogTitle>
            <DialogDescription>Search students with detailed filters</DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-2 gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="studentId">Student ID</Label>
              <Input id="studentId" placeholder="Enter student ID" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="surname">Surname</Label>
              <Input id="surname" placeholder="Enter surname" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="firstname">First Name</Label>
              <Input id="firstname" placeholder="Enter first name" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="chineseName">Chinese Name</Label>
              <Input id="chineseName" placeholder="Enter Chinese name" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="passport">Passport</Label>
              <Input id="passport" placeholder="Enter passport" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="gender">Gender</Label>
              <Select>
                <SelectTrigger>
                  <SelectValue placeholder="Select gender" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="M">Male</SelectItem>
                  <SelectItem value="F">Female</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="birthday">Date of Birth</Label>
              <div className="flex space-x-2">
                <Input type="date" />
                <span className="flex items-center px-2">to</span>
                <Input type="date" />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="enrollStatus">Enrollment Status</Label>
              <Select>
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="new">New</SelectItem>
                  <SelectItem value="archived">Archived</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="yearApply">Year Apply</Label>
              <Select>
                <SelectTrigger>
                  <SelectValue placeholder="Select year" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="9">Year 9</SelectItem>
                  <SelectItem value="10">Year 10</SelectItem>
                  <SelectItem value="11">Year 11</SelectItem>
                  <SelectItem value="12">Year 12</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="entryYear">Entry Year</Label>
              <Input type="date" />
            </div>
          </div>

          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={() => setShowAdvancedSearch(false)}>
              Cancel
            </Button>
            <Button variant="outline">Reset</Button>
            <Button className="bg-blue-600 hover:bg-blue-700">Search</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Student Dialog */}
      <Dialog open={showAddStudent} onOpenChange={setShowAddStudent}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add New Student</DialogTitle>
            <DialogDescription>Enter student information below</DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-2 gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="new-studentId">Student ID</Label>
              <Input id="new-studentId" placeholder="Enter student ID" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-surname">Surname</Label>
              <Input id="new-surname" placeholder="Enter surname" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-firstname">First Name</Label>
              <Input id="new-firstname" placeholder="Enter first name" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-chineseName">Chinese Name</Label>
              <Input id="new-chineseName" placeholder="Enter Chinese name" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-gender">Gender</Label>
              <Select>
                <SelectTrigger>
                  <SelectValue placeholder="Select gender" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="M">Male</SelectItem>
                  <SelectItem value="F">Female</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-dob">Date of Birth</Label>
              <Input type="date" id="new-dob" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-passport">Passport</Label>
              <Input id="new-passport" placeholder="Enter passport" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-yearApply">Year Apply</Label>
              <Select>
                <SelectTrigger>
                  <SelectValue placeholder="Select year" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="9">Year 9</SelectItem>
                  <SelectItem value="10">Year 10</SelectItem>
                  <SelectItem value="11">Year 11</SelectItem>
                  <SelectItem value="12">Year 12</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 col-span-2">
              <Label htmlFor="new-address">Address</Label>
              <Input id="new-address" placeholder="Enter address" />
            </div>
          </div>

          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={() => setShowAddStudent(false)}>
              Cancel
            </Button>
            <Button className="bg-blue-600 hover:bg-blue-700">Save Student</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
