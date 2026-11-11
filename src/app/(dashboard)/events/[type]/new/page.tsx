import { notFound, redirect } from "next/navigation"
import { URL_TO_TYPE_CODE } from "@/lib/supabase/queries/events"
import { requireAccess } from "@/lib/permissions/guard"
import { ACCESS, MODULES } from "@/lib/permissions/modules"

/** Adding an event happens in a drawer over its list; old links land there. */
export default async function NewEventPage({ params }: { params: Promise<{ type: string }> }) {
  await requireAccess(MODULES.EVENTS, ACCESS.WRITE)
  const { type } = await params
  if (!URL_TO_TYPE_CODE[type]) notFound()
  redirect(`/events/${type}?add=event`)
}
