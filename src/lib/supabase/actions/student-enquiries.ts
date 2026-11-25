'use server'

import { revalidatePath } from 'next/cache'
import { cookies } from 'next/headers'
import { z } from 'zod'
import type { ActionResult } from '@/lib/action-result'
import { createClient } from '@/lib/supabase/server'
import { assertAccess } from '@/lib/permissions/guard'
import { ACCESS, MODULES } from '@/lib/permissions/modules'
import { nextStudentCode } from '@/lib/students/student-code'

const optionalText = (max: number) => z.string().trim().max(max).transform(v => v || null).nullish()

const enquirySchema = z.object({
  first_name: z.string().trim().min(1, 'Enter the student’s first name').max(100),
  surname: z.string().trim().min(1, 'Enter the student’s surname').max(100),
  parent_name: optionalText(200),
  parent_relationship: z.enum(['mother', 'father', 'guardian']).nullish(),
  phone: optionalText(50),
  email: z.string().trim().max(200).email('Enter a valid email address').or(z.literal('')).transform(v => v || null).nullish(),
  entry_year: z.coerce.number().int().min(2000).max(2100).nullish(),
  lead_source_category: z.enum(['walk_in', 'referral', 'events', 'direct']).nullish(),
  lead_source_referral_detail: optionalText(200),
  remarks: optionalText(2000),
})

export type EnquiryInput = z.input<typeof enquirySchema>

/**
 * A quick enquiry: the student's name, who got in touch and how to reach them,
 * saved as an Enquiry with its own student code. The rest is filled in with the
 * full form once the family goes ahead.
 *
 * A named parent becomes a family contact holding the phone and email; with no
 * parent named, the phone and email are kept on the student.
 */
export async function createEnquiry(input: EnquiryInput): Promise<ActionResult<{ id: string }>> {
  const denied = await assertAccess(MODULES.STUDENTS, ACCESS.WRITE)
  if (denied) return denied
  const parsed = enquirySchema.safeParse(input)
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? 'Check the enquiry details' }
  const e = parsed.data

  try {
    const supabase = createClient(await cookies())
    const [{ data: status }, code] = await Promise.all([
      supabase.from('student_statuses').select('id').eq('code', 'enquiry').maybeSingle(),
      nextStudentCode(supabase),
    ])
    if (!status) return { success: false, error: 'The Enquiry status is not set up yet' }

    const toStudent = !e.parent_name
    const { data: student, error } = await supabase
      .from('students')
      .insert({
        student_code: code,
        first_name: e.first_name,
        surname: e.surname,
        status_id: status.id,
        entry_year: e.entry_year ?? null,
        lead_source_category: e.lead_source_category ?? null,
        lead_source_referral_detail: e.lead_source_category === 'referral' ? e.lead_source_referral_detail ?? null : null,
        remarks: e.remarks ?? null,
        mobile: toStudent ? e.phone ?? null : null,
        email: toStudent ? e.email ?? null : null,
      })
      .select('id')
      .single()
    if (error || !student) {
      console.error('Error creating enquiry:', error)
      return { success: false, error: error?.message ?? 'Could not save the enquiry' }
    }

    if (e.parent_name) {
      const { data: relationship } = e.parent_relationship
        ? await supabase.from('contact_relationships').select('id').eq('code', e.parent_relationship).maybeSingle()
        : { data: null }
      const { error: contactError } = await supabase.from('student_contacts').insert({
        student_id: student.id,
        relationship_id: relationship?.id ?? null,
        first_name: e.parent_name,
        mobile: e.phone ?? null,
        email_1: e.email ?? null,
        priority: 1,
      })
      if (contactError) {
        // The enquiry itself is saved; say so rather than lose it.
        console.error('Error adding the enquiry contact:', contactError)
        revalidatePath('/students')
        return { success: true, data: { id: student.id }, error: 'Enquiry saved, but the parent’s details could not be added. Add them on the Family tab.' }
      }
    }

    revalidatePath('/students')
    return { success: true, data: { id: student.id } }
  } catch (err) {
    console.error('Error in createEnquiry:', err)
    return { success: false, error: 'Could not save the enquiry' }
  }
}
