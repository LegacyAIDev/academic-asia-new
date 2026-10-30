import { canAccess } from "@/lib/permissions/guard"
import { ACCESS, MODULES } from "@/lib/permissions/modules"
import { ADMIN_LEVELS, hasMinLevel } from "@/lib/auth-utils"
import { getCurrentUser } from "@/lib/supabase/auth"
import { getApplicationOptions, getFiledEmails } from "@/lib/supabase/queries/filed-emails"
import type { EmailContext } from "@/lib/emails/email-draft"
import { CommunicationsPanel } from "./communications-panel"

/**
 * Loads a record's filed emails and the user's rights, then renders the panel.
 * The page has already checked read access; writing follows the page's module
 * (Students, or Schools on a school page) and deleting needs a Manager (D5).
 */
export async function CommunicationsSection({ context, title }: { context: EmailContext; title?: string }) {
  const pageModule = context.kind === "school" ? MODULES.SCHOOLS : MODULES.STUDENTS
  const target = context.kind === "student" ? { studentId: context.student.id }
    : context.kind === "school" ? { schoolId: context.school.id }
      : { applicationId: context.applicationId }

  const [emails, canWrite, user, applications] = await Promise.all([
    getFiledEmails(target),
    canAccess(pageModule, ACCESS.WRITE),
    getCurrentUser(),
    context.kind === "student" ? getApplicationOptions(context.student.id) : Promise.resolve(undefined),
  ])

  return (
    <CommunicationsPanel
      context={context}
      emails={emails}
      canWrite={canWrite}
      canDelete={canWrite && hasMinLevel(user?.admin_level, ADMIN_LEVELS.MANAGER)}
      applications={applications}
      title={title}
    />
  )
}
