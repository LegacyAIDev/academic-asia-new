"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Calendar, Mail, AlertCircle } from "lucide-react"
import type { Application } from "@/lib/dummy-data/applications"

export interface StatusChangeData {
  newStatus: string
  subStatus?: string
  reason: string
  notes: string
  sendNotification: boolean
  scheduleFollowUp: boolean
  followUpDays?: number
}

interface StatusChangeDialogProps {
  application: Application
  open: boolean
  onOpenChange: (open: boolean) => void
  onStatusChange: (data: StatusChangeData) => void
}

const STATUS_OPTIONS = [
  { value: "Awaiting Interview", label: "Awaiting Interview", color: "yellow" },
  { value: "Proceed", label: "Proceed", color: "blue" },
  { value: "Offered", label: "Offered", color: "green" },
  { value: "Cannot Proceed", label: "Cannot Proceed", color: "red" },
  { value: "Withdrawn", label: "Withdrawn", color: "gray" },
  { value: "Enrolled", label: "Enrolled", color: "purple" },
]

const SUB_STATUS_OPTIONS: Record<string, string[]> = {
  Offered: ["Conditional Offer", "Unconditional Offer", "Scholarship Awarded", "Waitlisted"],
  "Cannot Proceed": ["Failed Interview", "Failed Entrance Exam", "Insufficient Qualifications", "Age Requirement"],
  Withdrawn: ["Student Decision", "Financial Reasons", "Alternative Offer", "Family Circumstances"],
  Enrolled: ["Deposit Paid", "Documents Submitted", "Visa Approved", "Confirmed Start Date"],
}

const WORKFLOW_SUGGESTIONS: Record<string, { email: string; followUpDays: number; actions: string[] }> = {
  "Awaiting Interview": {
    email: "Interview preparation checklist",
    followUpDays: 7,
    actions: ["Send interview prep materials", "Schedule interview", "Confirm availability"],
  },
  Proceed: {
    email: "Application progress update",
    followUpDays: 14,
    actions: ["Request additional documents", "Follow up with school", "Update family"],
  },
  Offered: {
    email: "Offer letter and next steps",
    followUpDays: 7,
    actions: ["Send offer letter", "Explain deposit process", "Schedule enrollment call"],
  },
  "Cannot Proceed": {
    email: "Alternative recommendations",
    followUpDays: 0,
    actions: ["Provide feedback", "Suggest alternative schools", "Offer re-application guidance"],
  },
  Enrolled: {
    email: "Welcome package",
    followUpDays: 30,
    actions: ["Send welcome materials", "Arrange accommodation", "Schedule orientation"],
  },
}

export function StatusChangeDialog({ application, open, onOpenChange, onStatusChange }: StatusChangeDialogProps) {
  const [formData, setFormData] = useState<StatusChangeData>({
    newStatus: application.enrolStatus,
    subStatus: application.subEnrolStatus || "",
    reason: "",
    notes: "",
    sendNotification: true,
    scheduleFollowUp: true,
    followUpDays: 7,
  })

  const currentStatusConfig = WORKFLOW_SUGGESTIONS[formData.newStatus]
  const availableSubStatuses = SUB_STATUS_OPTIONS[formData.newStatus] || []

  const handleSubmit = () => {
    if (!formData.reason.trim()) {
      alert("Please provide a reason for the status change")
      return
    }
    onStatusChange(formData)
    onOpenChange(false)
    // Reset form
    setFormData({
      newStatus: application.enrolStatus,
      subStatus: "",
      reason: "",
      notes: "",
      sendNotification: true,
      scheduleFollowUp: true,
      followUpDays: 7,
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Change Application Status</DialogTitle>
          <p className="text-sm text-gray-600">
            Update the status for {application.studentName}'s application to {application.schoolName}
          </p>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Current Status */}
          <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
            <span className="text-sm text-gray-600">Current Status:</span>
            <Badge variant="outline" className="bg-white">
              {application.enrolStatus}
            </Badge>
            {application.subEnrolStatus && (
              <>
                <span className="text-gray-400">•</span>
                <Badge variant="outline" className="bg-white">
                  {application.subEnrolStatus}
                </Badge>
              </>
            )}
          </div>

          {/* New Status */}
          <div className="space-y-2">
            <Label htmlFor="newStatus">New Status *</Label>
            <Select
              value={formData.newStatus}
              onValueChange={(value) => {
                const suggestion = WORKFLOW_SUGGESTIONS[value]
                setFormData({
                  ...formData,
                  newStatus: value,
                  subStatus: "",
                  followUpDays: suggestion?.followUpDays || 7,
                })
              }}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Sub Status */}
          {availableSubStatuses.length > 0 && (
            <div className="space-y-2">
              <Label htmlFor="subStatus">Sub-Status (Optional)</Label>
              <Select
                value={formData.subStatus}
                onValueChange={(value) => setFormData({ ...formData, subStatus: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select sub-status..." />
                </SelectTrigger>
                <SelectContent>
                  {availableSubStatuses.map((option) => (
                    <SelectItem key={option} value={option}>
                      {option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Reason */}
          <div className="space-y-2">
            <Label htmlFor="reason">Reason for Change *</Label>
            <Textarea
              id="reason"
              placeholder="Brief explanation of why the status is changing..."
              value={formData.reason}
              onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
              rows={2}
              className="resize-none"
            />
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Additional Notes (Optional)</Label>
            <Textarea
              id="notes"
              placeholder="Any additional context or information..."
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={3}
              className="resize-none"
            />
          </div>

          {/* Workflow Suggestions */}
          {currentStatusConfig && (
            <Alert className="border-blue-200 bg-blue-50">
              <AlertCircle className="h-4 w-4 text-blue-600" />
              <AlertDescription className="text-sm text-gray-900">
                <p className="font-semibold mb-2">Recommended Actions:</p>
                <ul className="list-disc list-inside space-y-1">
                  {currentStatusConfig.actions.map((action, i) => (
                    <li key={i}>{action}</li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          )}

          {/* Automation Options */}
          <div className="space-y-3 p-4 bg-gray-50 rounded-lg border border-gray-200">
            <h4 className="font-semibold text-sm text-gray-900">Automation Options</h4>

            {/* Email Notification */}
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.sendNotification}
                onChange={(e) => setFormData({ ...formData, sendNotification: e.target.checked })}
                className="mt-1"
              />
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-blue-600" />
                  <span className="text-sm font-medium text-gray-900">Send Email Notification</span>
                </div>
                {currentStatusConfig && (
                  <p className="text-xs text-gray-600 mt-1">Will send: "{currentStatusConfig.email}"</p>
                )}
              </div>
            </label>

            {/* Follow-up */}
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.scheduleFollowUp}
                onChange={(e) => setFormData({ ...formData, scheduleFollowUp: e.target.checked })}
                className="mt-1"
              />
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-purple-600" />
                  <span className="text-sm font-medium text-gray-900">Schedule Follow-up</span>
                </div>
                {formData.scheduleFollowUp && (
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-xs text-gray-600">Follow up in:</span>
                    <Select
                      value={formData.followUpDays?.toString()}
                      onValueChange={(value) => setFormData({ ...formData, followUpDays: Number.parseInt(value) })}
                    >
                      <SelectTrigger className="w-32 h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="3">3 days</SelectItem>
                        <SelectItem value="7">7 days</SelectItem>
                        <SelectItem value="14">14 days</SelectItem>
                        <SelectItem value="30">30 days</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
            </label>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!formData.reason.trim()}>
            Update Status
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
