import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Plus, Eye } from "lucide-react"
import Link from "next/link"
import type { Application } from "@/lib/dummy-data/applications"

interface SchoolApplicationTabProps {
  applications: Application[]
}

export function SchoolApplicationTab({ applications }: SchoolApplicationTabProps) {
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
      default:
        return "bg-gray-50 text-gray-700 border-gray-200"
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">School Applications</h3>
          <p className="text-sm text-gray-600 mt-1">Total Applications Found: {applications.length}</p>
        </div>
        <Button size="sm" asChild>
          <Link href="/applications/new">
            <Plus className="h-4 w-4 mr-2" />
            Add Application
          </Link>
        </Button>
      </div>

      <div className="border border-gray-200 rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-gray-50">
              <TableHead>Name</TableHead>
              <TableHead>Year Apply</TableHead>
              <TableHead>Course Detail</TableHead>
              <TableHead>C.S.D.</TableHead>
              <TableHead>Referral</TableHead>
              <TableHead>Enrol Status</TableHead>
              <TableHead>Sub-Enrol Status</TableHead>
              <TableHead>Sch.</TableHead>
              <TableHead>S. Detail</TableHead>
              <TableHead>Event Name</TableHead>
              <TableHead>Event Date</TableHead>
              <TableHead className="w-12"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {applications.map((app) => (
              <TableRow key={app.id} className="hover:bg-gray-50">
                <TableCell className="font-medium">{app.schoolName}</TableCell>
                <TableCell className="text-sm">{app.yearApply}</TableCell>
                <TableCell className="text-sm">{app.courseDetail || "-"}</TableCell>
                <TableCell className="text-sm">{app.csd}</TableCell>
                <TableCell className="text-sm">{app.referral}</TableCell>
                <TableCell>
                  <Badge variant="outline" className={getStatusColor(app.enrolStatus)}>
                    {app.enrolStatus}
                  </Badge>
                </TableCell>
                <TableCell className="text-sm">{app.subEnrolStatus || "-"}</TableCell>
                <TableCell className="text-sm text-center">0</TableCell>
                <TableCell className="text-sm">{app.schDetail || "-"}</TableCell>
                <TableCell className="text-sm max-w-[200px] truncate">{app.eventName}</TableCell>
                <TableCell className="text-sm">{app.eventDate}</TableCell>
                <TableCell>
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                    <Eye className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between pt-4 border-t border-gray-200">
        <p className="text-sm text-gray-600">
          Showing {applications.length} of {applications.length} applications
        </p>
        <div className="flex items-center space-x-2">
          <Button variant="outline" size="sm">
            Refresh
          </Button>
          <Button variant="outline" size="sm">
            Export
          </Button>
        </div>
      </div>
    </div>
  )
}
