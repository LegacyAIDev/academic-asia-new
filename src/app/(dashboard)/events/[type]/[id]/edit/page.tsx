import { notFound, redirect } from "next/navigation"
import { URL_TO_TYPE_CODE } from "@/lib/supabase/queries/events"
import { requireAccess } from "@/lib/permissions/guard"
import { ACCESS, MODULES } from "@/lib/permissions/modules"

/** Editing an event happens in a drawer over its page; old links land there. */
export default async function EditEventPage({ params }: { params: Promise<{ type: string; id: string }> }) {
  await requireAccess(MODULES.EVENTS, ACCESS.WRITE)
  const { type, id } = await params
  if (!URL_TO_TYPE_CODE[type]) notFound()
  redirect(`/events/${type}/${id}?edit=details`)
}
