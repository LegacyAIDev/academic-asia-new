import type { SupabaseClient } from '@supabase/supabase-js'
import type { OwnerConfig } from '@/lib/attachments/attach-points'
import type { Database, TablesInsert } from '@/types/database'

/**
 * The columns student_documents and school_documents have in common: a
 * document row without its owner, and without either table's own extras.
 */
export type DocumentRow = Omit<TablesInsert<'student_documents'>, 'student_id' | 'description'>

/**
 * Inserts a file or link into the owner's documents table (the attach point
 * decides which at runtime) and returns the new row's id.
 */
export function insertDocument(supabase: SupabaseClient<Database>, cfg: OwnerConfig, ownerId: string, row: DocumentRow) {
  return cfg.table === 'student_documents'
    ? supabase.from('student_documents').insert({ ...row, student_id: ownerId }).select('id').single()
    : supabase.from('school_documents').insert({ ...row, school_id: ownerId }).select('id').single()
}
