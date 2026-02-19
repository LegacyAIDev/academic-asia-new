import { createClient } from '@/lib/supabase/client'
import type { Tables, InsertTables, UpdateTables } from '@/types/database.types'

export type Student = Tables<'students'>
export type StudentInsert = InsertTables<'students'>
export type StudentUpdate = UpdateTables<'students'>

export const studentService = {
  async getAll(options?: {
    status?: string
    search?: string
    limit?: number
    offset?: number
  }) {
    const supabase = createClient()
    let query = supabase
      .from('students')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })

    if (options?.status) {
      query = query.eq('status', options.status)
    }

    if (options?.search) {
      query = query.or(
        `first_name.ilike.%${options.search}%,surname.ilike.%${options.search}%,student_code.ilike.%${options.search}%`
      )
    }

    if (options?.limit) {
      query = query.limit(options.limit)
    }

    if (options?.offset) {
      query = query.range(options.offset, options.offset + (options.limit || 10) - 1)
    }

    const { data, error, count } = await query

    if (error) throw error
    return { data, count }
  },

  async getById(id: string) {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('students')
      .select('*, student_contacts(*)')
      .eq('id', id)
      .single()

    if (error) throw error
    return data
  },

  async create(student: StudentInsert) {
    const supabase = createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    const { data, error } = await supabase
      .from('students')
      .insert({
        ...student,
        created_by: user?.id,
      })
      .select()
      .single()

    if (error) throw error
    return data
  },

  async update(id: string, student: StudentUpdate) {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('students')
      .update(student)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return data
  },

  async delete(id: string) {
    const supabase = createClient()
    const { error } = await supabase.from('students').delete().eq('id', id)

    if (error) throw error
  },
}
