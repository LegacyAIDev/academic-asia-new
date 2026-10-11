import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import { canAccess } from '@/lib/permissions/guard'
import {
  EXAM_PAPER_ACCESS, EXAM_PAPER_ATTACHABLE_TYPE, EXAM_PAPER_CATEGORY_CODE, isExamPaperRow,
} from '@/lib/attachments/exam-paper-access'
import { getCategoryId } from '@/lib/supabase/document-categories'

export type SchoolDocumentRecord = {
  id: string
  school_id: string
  category_id: number
  file_name: string
  file_path: string
  file_size: number | null
  mime_type: string | null
  title: string | null
  category: { id: number; code: string; label: string } | null
}

/**
 * All documents for a school, newest first. Entrance exam papers are stored in
 * the same table, so they are left out unless the user belongs to the exam team.
 */
export async function getSchoolDocuments(schoolId: string): Promise<SchoolDocumentRecord[]> {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  const { data, error } = await supabase
    .from('school_documents')
    .select('*, category:document_categories(id, code, label)')
    .eq('school_id', schoolId)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching school documents:', error)
    return []
  }
  const documents = (data ?? []) as unknown as (SchoolDocumentRecord & { attachable_type: string | null })[]
  if (await canAccess(EXAM_PAPER_ACCESS.module, EXAM_PAPER_ACCESS.read)) return documents
  return documents.filter(document => !isExamPaperRow(document))
}

export type StoredSchoolDocument = {
  file_path: string | null
  attachable_type: string | null
  category: { code: string } | null
}

type SupabaseServerClient = ReturnType<typeof createClient>

/** A path is normally stored once; this only bounds the lookup. */
const MAX_ROWS_PER_LOOKUP = 20

/**
 * The stored row behind a document id or an exact storage path, for actions
 * that must decide what may be done with it. Unlike the list above it applies
 * no access filter. A failed lookup throws instead of returning nothing:
 * "could not check" must never be read as "not a paper".
 *
 * Nothing stops two rows from naming the same stored file, so when several
 * match, an exam paper among them wins: the strictest rule decides.
 */
export async function findStoredSchoolDocument(
  supabase: SupabaseServerClient,
  by: 'id' | 'file_path',
  value: string,
): Promise<StoredSchoolDocument | null> {
  const { data, error } = await supabase
    .from('school_documents')
    .select('file_path, attachable_type, category:document_categories(code)')
    .eq(by, value)
    .limit(MAX_ROWS_PER_LOOKUP + 1)
  if (error) throw error
  const rows = (data ?? []) as unknown as StoredSchoolDocument[]
  // More rows than the lookup holds means some went unchecked: that counts as a failed lookup.
  if (rows.length > MAX_ROWS_PER_LOOKUP) throw new Error('Too many documents share this storage path')
  return rows.find(isExamPaperRow) ?? rows[0] ?? null
}

/**
 * How many exam papers a whole school, or one of its entrance exams, holds.
 * Returns null when that could not be established; callers treat null as
 * "there may be papers" and refuse.
 */
export async function countExamPapers(
  supabase: SupabaseServerClient,
  scope: { schoolId: string } | { examId: string },
): Promise<number | null> {
  let query = supabase.from('school_documents').select('id', { count: 'exact', head: true })
  if ('examId' in scope) {
    query = query.eq('attachable_type', EXAM_PAPER_ATTACHABLE_TYPE).eq('attachable_id', scope.examId)
  } else {
    // A paper is known by the exam it hangs off or by its category, so both are counted.
    const categoryId = await getCategoryId(supabase, EXAM_PAPER_CATEGORY_CODE)
    if (categoryId === null) return null
    query = query
      .eq('school_id', scope.schoolId)
      .or(`attachable_type.eq.${EXAM_PAPER_ATTACHABLE_TYPE},category_id.eq.${categoryId}`)
  }
  const { count, error } = await query
  return error ? null : count
}
