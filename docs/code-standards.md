# Code Standards & Conventions

**Last updated:** 2026-06-24

This document is the canonical reference for how code is written and organized in this project. All contributors must follow these patterns. When in doubt, look at `students/[id]/` (most complex entity) and `schools/[id]/` as the reference implementations.

---

## 1. File & Directory Naming

- **kebab-case** for all files and directories: `student-form.tsx`, `school-bank-details.tsx`, `event-form-types.ts`.
- Names must be self-documenting — a developer reading a file name in a grep result should understand the file's purpose without opening it.
- Keep files under **200 lines**. Split proactively into focused components/modules.

---

## 2. TypeScript

- TypeScript strict mode is on (`tsconfig.json`).
- Run `npm run type-check` to verify before committing.
- Types for the database are generated — never hand-write database row types. Run `npm run db:types` to regenerate `src/types/database.ts` after schema changes.
- Extended/aliased types (e.g., `StudentInsert`, `StudentUpdate`) live in `src/types/database.types.ts`.

---

## 3. Path Aliases

Use the `@/*` alias (maps to `src/*`) everywhere. Never use relative `../../` imports outside of the same directory.

```typescript
// Good
import { createClient } from '@/lib/supabase/server'
import { Button } from '@/components/ui/button'

// Bad
import { createClient } from '../../lib/supabase/server'
```

---

## 4. Supabase Client Usage

Three distinct clients exist. Use the right one:

| Client | File | When to use |
|---|---|---|
| Browser client | `src/lib/supabase/client.ts` | Client components that need Supabase access (rare — prefer Server Actions) |
| Server client | `src/lib/supabase/server.ts` | Server Components, Server Actions, Route Handlers |
| Admin client | `src/lib/supabase/admin.ts` | Server-only operations requiring service role (e.g., creating auth users from migration scripts). **Never import in client components or expose to browser.** |

The server client reads `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY` (not the legacy `NEXT_PUBLIC_SUPABASE_ANON_KEY`).

```typescript
// Server Component or Server Action
import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'

const cookieStore = await cookies()
const supabase = createClient(cookieStore)
```

---

## 5. Server Actions

All database mutations go through Server Actions in `src/lib/supabase/actions/`. One file per domain entity.

### Required conventions:

**5.1 Directive and imports**

```typescript
'use server'

import { revalidatePath } from 'next/cache'
import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
```

**5.2 Typed input**

Export a typed `Input` type for each action. Do not use raw `FormData` or `any`.

```typescript
export type CreateStudentInput = {
  surname: string
  first_name: string
  email?: string | null
  // ... all fields explicitly typed
}
```

**5.3 ActionResult return type**

Every action returns `ActionResult<T>`. This type is defined in `src/lib/supabase/actions/students.ts` and re-used across actions.

```typescript
export type ActionResult<T = void> = {
  success: boolean
  data?: T
  error?: string
}
```

**5.4 try/catch with typed error**

```typescript
export async function createStudent(input: CreateStudentInput): Promise<ActionResult<{ id: string }>> {
  try {
    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)

    const { data, error } = await supabase
      .from('students')
      .insert({ ...input })
      .select('id')
      .single()

    if (error) return { success: false, error: error.message }

    revalidatePath('/students')
    return { success: true, data: { id: data.id } }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' }
  }
}
```

**5.5 revalidatePath after mutations**

Always call `revalidatePath` after any insert, update, or delete to invalidate Next.js cache.

---

## 6. Queries (Read-Only Data Fetching)

Reads live in `src/lib/supabase/queries/`. One file per domain entity, mirroring the actions structure. Queries are used in Server Components — they return typed data or `null`/empty arrays on error.

```typescript
// queries/students.ts — no 'use server' needed, these are plain async functions
import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'

export async function getStudent(id: string) {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  const { data, error } = await supabase
    .from('students')
    .select('*, contacts:student_contacts(*)')
    .eq('id', id)
    .single()

  if (error) return null
  return data
}
```

**Separation rule**: queries/ = reads only. actions/ = writes only. Never mix them.

---

## 7. Page & Component Patterns

### 7.1 Large entity detail pages

Student and school detail pages follow a section + dialog split pattern. Each sub-entity (contacts, applications, visas, etc.) has:
- A **section component** (e.g., `student-contacts.tsx`) — renders the data table/list for that sub-entity on the detail page.
- A **dialog component** (e.g., `contact-dialog.tsx`) — modal for creating or editing a single record.

This keeps individual files well under the 200-line target. `students/[id]/page.tsx` composes all section components.

### 7.2 Shared forms

Create and edit flows share a single form component (e.g., `student-form.tsx`, `school-form.tsx`). The form receives initial data (or `undefined` for new) and handles both cases.

### 7.3 Server vs Client components

- Default to **Server Components** for data display (no `'use client'` directive needed).
- Use `'use client'` only for interactive elements: forms, dialogs, drag-and-drop, calendar.
- Pass serialized data (not Supabase clients) from Server to Client components.

---

## 8. Forms

All forms use react-hook-form + zod. No uncontrolled inputs, no raw `FormData`.

```typescript
'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'

const schema = z.object({
  surname: z.string().min(1, 'Required'),
  email: z.string().email().optional().or(z.literal('')),
})

type FormValues = z.infer<typeof schema>

export function StudentForm() {
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { surname: '', email: '' },
  })

  async function onSubmit(values: FormValues) {
    const result = await createStudent(values)
    if (!result.success) {
      toast.error(result.error)
      return
    }
    toast.success('Student created')
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        {/* form fields */}
      </form>
    </Form>
  )
}
```

---

## 9. UI Components

Use existing shadcn/ui primitives from `src/components/ui/`. Do not hand-write Radix primitives from scratch. To add a new primitive:

```bash
npx shadcn add <component-name>
```

Class composition uses `cn()` from `src/lib/utils.ts`:

```typescript
import { cn } from '@/lib/utils'

<div className={cn('base-class', condition && 'conditional-class', className)} />
```

---

## 10. RBAC / Access Control

Access is per **module**, not per role. Eight modules — `dashboard`, `students`,
`schools`, `events`, `exams`, `staff`, `reports`, `settings` — each carry one of three
levels: `NONE (0)`, `READ (1)`, `WRITE (2)`.

A staff member inherits the defaults of their admin level (`admin_level_permissions`)
and may deviate per module (`profile_permission_overrides`). The database function
`resolve_permissions(profile_id)` combines the two. Super Admin (level 0) resolves to
full write unconditionally, so the last administrator can never be locked out.

Permissions resolve **from the database per request**, not from a JWT claim: a claim
only refreshes when the token does (up to an hour), so revoking access would not take
effect until then. `getPermissions()` is wrapped in React `cache()`, so repeat calls
within one request cost one query.

### Guarding a page

```typescript
import { requireAccess } from '@/lib/permissions/guard'
import { ACCESS, MODULES } from '@/lib/permissions/modules'

export default async function StudentsPage() {
  await requireAccess(MODULES.STUDENTS)                  // list / detail
  // ...
}

export default async function EditStudentPage() {
  await requireAccess(MODULES.STUDENTS, ACCESS.WRITE)    // new / edit
  // ...
}
```

Rule: pages under a `new/` or `edit/` segment require `WRITE`, everything else `READ`.
`requireAccess` redirects to `/403`.

### Guarding a Server Action

Guards go **first**, before validation, so a denied caller gets "insufficient
permissions" rather than a field error that leaks whether a record exists.

```typescript
const denied = await assertAccess(MODULES.STAFF, ACCESS.WRITE)
if (denied) return denied
```

`assertAccess` returns an `ActionResult`-shaped error, never throws (see §11). It also
covers the signed-out case — an anonymous caller resolves to all-`NONE`.

### Conditional rendering

```typescript
const canWrite = await canAccess(MODULES.STUDENTS, ACCESS.WRITE)
// ...
{canWrite && <Button asChild><Link href="/students/new">Add Student</Link></Button>}
```

Hide write actions rather than disabling them — a greyed-out button invites a support
ticket.

### Preventing privilege escalation

`WRITE` on the `staff` module would otherwise equal Super Admin, since the holder could
promote themselves. Three guards, each covering a different route to the same outcome:

| Guard | Blocks |
|---|---|
| `assertNoEscalation(callerLevel, target)` | Granting a level or module access above your own |
| `assertOutranksTarget(profileId)` | Acting on a **more senior** colleague at all |
| `assertCanManageAccess(callerLevel)` | Changing anyone's access rights below Manager |

`assertOutranksTarget` reads the target's **current** level from the database, not the
level in the payload. Checking only the payload was exploitable: a request that simply
omitted `admin_level` skipped the check, so `staff:WRITE` was enough to reset a Super
Admin's password or delete the account. Peers are allowed — a Manager may administer
another Manager — otherwise routine admin work stalls whenever two people share a level.

Call sites: `createStaff` (escalation), `updateStaff` and `deleteStaff` (outranks +
escalation), `setProfilePermissions` (all three), `setLevelPermissions` (manage + escalation).

The staff form mirrors these rules with `hasMinLevel(user.admin_level, ADMIN_LEVELS.MANAGER)`
to disable the controls, but **the client is never the enforcement point** — every rule
above is re-checked in the Server Action.

`hasMinLevel` remains the right tool for seniority questions ("is this person senior
enough"), which are distinct from module access. Note levels are inverted — **lower
number means more access** — and Super Admin is `0`, which is falsy; never write
`if (!level)`.

### Coverage

`npm run check:permissions` fails the build if a dashboard page ships without
`requireAccess` or an action file has fewer `assertAccess` calls than exported actions.
Allowlisted: `/403` and `actions/auth.ts`.

> ⚠️ **RLS is still permissive.** All ~197 policies grant any authenticated user full
> access, so these app-layer guards are the *only* enforcement. Actions using
> `createAdminClient()` bypass RLS entirely, making their guard especially load-bearing.
> Tightening RLS is tracked as follow-up work.

---

## 11. Error Handling

- Server Actions: always return `ActionResult` — never throw to the client.
- Queries: return `null` or `[]` on error — log errors server-side if needed.
- Client components: read `result.error` from Server Actions and show via `sonner` toast:

```typescript
import { toast } from 'sonner'

const result = await someAction(input)
if (!result.success) {
  toast.error(result.error ?? 'Something went wrong')
  return
}
toast.success('Done')
```

---

## 12. Styling

- Tailwind CSS v4 only. No CSS modules, no inline style objects (except when unavoidable for dynamic values).
- No custom CSS unless it cannot be achieved with Tailwind utilities.
- `tw-animate-css` is available for additional animation utilities.
- `next-themes` handles dark/light mode — use `dark:` variants for theme-aware styles.

---

## 13. Comments

Write comments for non-obvious logic. Comments should sound like a knowledgeable developer explaining something to a colleague — not robotic or AI-generated.

```typescript
// Good: explains why, not what
// Generate a sequential student code (S0001, S0002, ...) by finding the current max
// and incrementing. Falls back to S0001 if no students exist yet.

// Bad: just restates the code
// Get the student code
```

Function-level JSDoc is optional but useful for public-facing utilities and helper functions.

---

## 14. Pre-commit Checklist

Before committing:
1. `npm run type-check` — zero errors
2. `npm run lint` — zero errors
3. No `.env*` files staged
4. No console.log left in production code paths
5. No hardcoded credentials or API keys
