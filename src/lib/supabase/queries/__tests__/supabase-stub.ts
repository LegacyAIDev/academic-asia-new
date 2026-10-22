import type { createClient } from '@/lib/supabase/server'

export type Call = { method: string; args: unknown[] }
export type Recorded = { table: string; calls: Call[] }
export type StorageCall = { bucket: string; method: string; args: unknown[] }
type Result = { data: unknown; error: unknown; count?: number | null }

const CHAIN_METHODS = [
  'select', 'eq', 'neq', 'gte', 'lte', 'in', 'or', 'order', 'limit',
  'like', 'overlaps', 'range',
  'insert', 'update', 'delete', 'single', 'maybeSingle',
]

/**
 * Chainable stand-in for the supabase query builder. Every `.from()` records
 * its table and each builder call, and awaiting the chain resolves to whatever
 * the `respond` callback returns for that table. Storage calls are recorded
 * too: signing echoes the path back so a test can see what was signed.
 */
export function makeSupabaseStub(respond: (rec: Recorded) => Result = () => ({ data: [], error: null })) {
  const queries: Recorded[] = []
  const storageCalls: StorageCall[] = []
  const stub = {
    storage: {
      from(bucket: string) {
        return {
          createSignedUrl: async (...args: unknown[]) => {
            storageCalls.push({ bucket, method: 'createSignedUrl', args })
            return { data: { signedUrl: `signed:${String(args[0])}` }, error: null }
          },
          upload: async (...args: unknown[]) => {
            storageCalls.push({ bucket, method: 'upload', args })
            return { data: { path: String(args[0]) }, error: null }
          },
          remove: async (...args: unknown[]) => {
            storageCalls.push({ bucket, method: 'remove', args })
            return { data: [], error: null }
          },
          list: async (...args: unknown[]) => {
            storageCalls.push({ bucket, method: 'list', args })
            return { data: [], error: null }
          },
        }
      },
    },
    from(table: string) {
      const rec: Recorded = { table, calls: [] }
      queries.push(rec)
      const chain: Record<string, unknown> = {
        then: (resolve: (value: Result) => unknown, reject?: (reason: unknown) => unknown) =>
          Promise.resolve(respond(rec)).then(resolve, reject),
      }
      for (const method of CHAIN_METHODS) {
        chain[method] = (...args: unknown[]) => {
          rec.calls.push({ method, args })
          return chain
        }
      }
      return chain
    },
  }
  return { supabase: stub as unknown as ReturnType<typeof createClient>, queries, storageCalls }
}

export const callsOf = (rec: Recorded, method: string) => rec.calls.filter(c => c.method === method).map(c => c.args)

/** True when the recorded query used the given builder method, e.g. to tell a delete from a lookup. */
export const used = (rec: Recorded, method: string) => rec.calls.some(c => c.method === method)
