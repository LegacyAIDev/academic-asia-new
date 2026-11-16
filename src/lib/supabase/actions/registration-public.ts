'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { nextStudentCode } from '@/lib/students/student-code'
import { checkRegistration, hashRegistrationToken, looksLikeToken, type RegistrationInput } from '@/lib/registration/registration-form'

/**
 * The public registration form's only action. Families are not signed in, so
 * there is no permission guard: the one-use link is the permission. It is
 * checked and used up in one statement before anything is written, so a link
 * cannot create two students, and everything typed is checked again here.
 */

type SubmitResult = { success: true } | { success: false; error?: string; errors?: Record<string, string> }

const SPENT = 'This link has expired or has already been used. Please ask Academic Asia for a new one.'

export async function submitRegistration(token: string, raw: Partial<RegistrationInput>): Promise<SubmitResult> {
  if (typeof token !== 'string' || !looksLikeToken(token)) return { success: false, error: SPENT }
  const checked = checkRegistration(raw)
  if (!checked.ok) return { success: false, errors: checked.errors }

  const admin = createAdminClient()
  const now = new Date().toISOString()
  // Claim the link: only an unused, unexpired link matches, and only once.
  const { data: claimed, error: claimError } = await admin
    .from('registration_links' as never)
    .update({ used_at: now } as never)
    .eq('token_hash', hashRegistrationToken(token))
    .is('used_at', null)
    .gt('expires_at', now)
    .select('id')
  if (claimError) {
    console.error('Error claiming registration link:', claimError)
    return { success: false, error: 'Something went wrong. Please try again.' }
  }
  const linkId = (claimed as { id: string }[] | null)?.[0]?.id
  if (!linkId) return { success: false, error: SPENT }

  // Gives the link back if the student cannot be saved, so the family can try again.
  const release = () => admin.from('registration_links' as never).update({ used_at: null } as never).eq('id', linkId)

  try {
    const { student, parents, notes } = checked.data
    const code = await nextStudentCode(admin as never)
    const remarks = ['Registered online by the family.', notes ? `Family's notes: ${notes}` : null].filter(Boolean).join('\n')
    const { data: created, error: studentError } = await admin
      .from('students')
      .insert({ ...student, student_code: code, status_id: 1, remarks } as never)
      .select('id')
      .single()
    if (studentError || !created) {
      console.error('Error creating registered student:', studentError)
      await release()
      return { success: false, error: 'Something went wrong. Please try again.' }
    }
    const studentId = (created as { id: string }).id

    if (parents.length > 0) {
      const { data: rels } = await admin.from('contact_relationships').select('id, code').in('code', ['mother', 'father'])
      const relId = new Map(((rels ?? []) as { id: number; code: string }[]).map(r => [r.code, r.id]))
      const { error: parentError } = await admin.from('student_contacts').insert(parents.map((parent, i) => ({
        student_id: studentId,
        relationship_id: relId.get(parent.relationship) ?? null,
        first_name: parent.first_name, surname: parent.surname, mobile: parent.mobile, email_1: parent.email_1,
        gender: parent.relationship === 'mother' ? 'F' : 'M',
        priority: i + 1,
      })) as never)
      // The student is saved; a parent row that failed is noted for staff rather than lost silently.
      if (parentError) {
        console.error('Error saving registered parents:', parentError)
        await admin.from('students').update({ remarks: `${remarks}\nParents' details could not be saved; please ask the family again.` } as never).eq('id', studentId)
      }
    }

    await admin.from('registration_links' as never).update({ student_id: studentId } as never).eq('id', linkId)
    return { success: true }
  } catch (err) {
    console.error('Error in submitRegistration:', err)
    await release()
    return { success: false, error: 'Something went wrong. Please try again.' }
  }
}
