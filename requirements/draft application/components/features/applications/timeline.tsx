"use client"
import { CheckCircle, Circle, FileText, Mail, Calendar, Award } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import type { ApplicationActivity } from "@/lib/dummy-data/application-activity"

interface TimelineProps {
  activities: ApplicationActivity[]
}

export function Timeline({ activities }: TimelineProps) {
  const getActivityIcon = (type: ApplicationActivity["type"]) => {
    switch (type) {
      case "status_change":
        return <CheckCircle className="h-5 w-5 text-blue-600" />
      case "interview_scheduled":
        return <Calendar className="h-5 w-5 text-purple-600" />
      case "document_uploaded":
        return <FileText className="h-5 w-5 text-green-600" />
      case "email_sent":
        return <Mail className="h-5 w-5 text-orange-600" />
      case "note_added":
        return <FileText className="h-5 w-5 text-gray-600" />
      case "offer_received":
        return <Award className="h-5 w-5 text-yellow-600" />
      default:
        return <Circle className="h-5 w-5 text-gray-400" />
    }
  }

  const getActivityColor = (type: ApplicationActivity["type"]) => {
    switch (type) {
      case "status_change":
        return "bg-blue-100 border-blue-200"
      case "interview_scheduled":
        return "bg-purple-100 border-purple-200"
      case "document_uploaded":
        return "bg-green-100 border-green-200"
      case "email_sent":
        return "bg-orange-100 border-orange-200"
      case "note_added":
        return "bg-gray-100 border-gray-200"
      case "offer_received":
        return "bg-yellow-100 border-yellow-200"
      default:
        return "bg-gray-100 border-gray-200"
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays < 7) return `${diffDays}d ago`

    return date.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    })
  }

  return (
    <div className="space-y-4">
      {activities.map((activity, index) => (
        <div key={activity.id} className="flex gap-4">
          {/* Timeline line */}
          <div className="flex flex-col items-center">
            <div className={`rounded-full p-2 border-2 ${getActivityColor(activity.type)}`}>
              {getActivityIcon(activity.type)}
            </div>
            {index < activities.length - 1 && <div className="w-0.5 flex-1 bg-gray-200 my-2" />}
          </div>

          {/* Content */}
          <div className="flex-1 pb-8">
            <div className="flex items-start justify-between mb-1">
              <div>
                <h4 className="font-semibold text-gray-900">{activity.title}</h4>
                {activity.description && <p className="text-sm text-gray-600 mt-1">{activity.description}</p>}
                {activity.oldValue && activity.newValue && (
                  <div className="flex items-center gap-2 mt-2">
                    <Badge variant="outline" className="bg-gray-50">
                      {activity.oldValue}
                    </Badge>
                    <span className="text-gray-400">→</span>
                    <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                      {activity.newValue}
                    </Badge>
                  </div>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2 text-xs text-gray-500 mt-2">
              <span className="font-medium">{activity.createdBy}</span>
              <span>•</span>
              <span>{formatDate(activity.createdAt)}</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

export function TimelineCompact({ activities }: TimelineProps) {
  const recentActivities = activities.slice(0, 3)

  return (
    <div className="space-y-3">
      {recentActivities.map((activity, index) => (
        <div key={activity.id} className="flex items-start gap-3">
          <div className="h-2 w-2 rounded-full bg-blue-600 mt-2" />
          <div className="flex-1">
            <p className="text-sm font-medium text-gray-900">{activity.title}</p>
            <p className="text-xs text-gray-500">
              {new Date(activity.createdAt).toLocaleDateString("en-GB", {
                day: "2-digit",
                month: "short",
                year: "numeric",
              })}
            </p>
          </div>
        </div>
      ))}
      {activities.length > 3 && (
        <p className="text-xs text-gray-500 text-center pt-2">+ {activities.length - 3} more activities</p>
      )}
    </div>
  )
}
