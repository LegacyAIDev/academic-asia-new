import { notFound } from 'next/navigation'
import {
  Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList,
  BreadcrumbPage, BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'
import { URL_TO_TYPE_CODE, EVENT_TYPE_LABELS } from '@/lib/supabase/queries/events'
import { getSchedulerData } from '@/lib/supabase/queries/event-scheduler'
import { EventScheduler } from './event-scheduler'
import { requireAccess } from "@/lib/permissions/guard"
import { ACCESS, MODULES } from "@/lib/permissions/modules"

type SchedulerPageParams = {
  params: Promise<{ type: string; id: string }>
}

export default async function SchedulerPage({ params }: SchedulerPageParams) {
  await requireAccess(MODULES.EVENTS, ACCESS.WRITE)

  const { type, id } = await params

  const typeCode = URL_TO_TYPE_CODE[type]
  if (!typeCode) notFound()

  const data = await getSchedulerData(id)

  if (!data.event) notFound()

  // Guard: only allow scheduler for 1:1 scheduling mode
  const schedulingCode = data.event.scheduling_mode?.code
  if (schedulingCode !== 'one_to_one') notFound()

  const typeLabel = EVENT_TYPE_LABELS[typeCode]

  return (
    <div className="space-y-4">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href="/">Dashboard</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink href={`/events/${type}`}>{typeLabel}</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink href={`/events/${type}/${id}`}>{data.event.name}</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>Scheduler</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <EventScheduler
        event={data.event}
        representatives={data.representatives}
        schedules={data.schedules}
        unassigned={data.unassigned}
        eventType={type}
      />
    </div>
  )
}
