import type { createClient } from '@/lib/supabase/server'

export type Call = { method: string; args: unknown[] }
export type Recorded = { table: string; calls: Call[] }
type Result = { data: unknown; error: unknown }

/**
 * Chainable stand-in for the supabase query builder. Every `.from()` records
 * its table and each builder call, and awaiting the chain resolves to whatever
 * the `respond` callback returns for that table.
 */
export function makeSupabaseStub(respond: (rec: Recorded) => Result = () => ({ data: [], error: null })) {
  const queries: Recorded[] = []
  const stub = {
    from(table: string) {
      const rec: Recorded = { table, calls: [] }
      queries.push(rec)
      const chain: Record<string, unknown> = {
        then: (resolve: (value: Result) => unknown, reject?: (reason: unknown) => unknown) =>
          Promise.resolve(respond(rec)).then(resolve, reject),
      }
      for (const method of ['select', 'eq', 'neq', 'gte', 'lte', 'in', 'or', 'order']) {
        chain[method] = (...args: unknown[]) => {
          rec.calls.push({ method, args })
          return chain
        }
      }
      return chain
    },
  }
  return { supabase: stub as unknown as ReturnType<typeof createClient>, queries }
}

export const callsOf = (rec: Recorded, method: string) => rec.calls.filter(c => c.method === method).map(c => c.args)
