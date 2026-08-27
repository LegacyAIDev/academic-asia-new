# System Architecture

**Last updated:** 2026-08-27

---

## 1. Architecture Overview

Academic Asia is a server-centric Next.js application backed by Supabase (managed Postgres + Auth). There is no separate API server — all data access happens through Next.js Server Components, Server Actions, and Route Handlers talking directly to Supabase.

```
Browser
  │
  ▼
Next.js Middleware (session refresh + auth guard)
  │
  ├─ Public routes (/login, /forgot-password, /reset-password, /auth/callback)
  │
  └─ Protected routes (dashboard)
       │
       ├─ Server Components → lib/supabase/queries/ → Supabase Postgres
       │
       └─ Client Components
            │
            └─ Server Actions ('use server') → lib/supabase/actions/ → Supabase Postgres
```

---

## 2. Next.js App Router Layout

The App Router uses two route groups:

| Group | Path | Purpose |
|---|---|---|
| `(auth)` | `/login`, `/forgot-password`, `/reset-password` | Unauthenticated pages — no sidebar or header |
| `(dashboard)` | All other protected routes | Authenticated shell with Sidebar + Header |

The `(dashboard)/layout.tsx` loads the current user server-side via `getCurrentUser()` and renders the navigation shell. All child pages inside this layout are protected.

---

## 3. Authentication Architecture

### 3.1 Supabase Auth + SSR

Sessions are managed by Supabase Auth using cookie-based storage via `@supabase/ssr`. On every request, the middleware calls `updateSession()` which:
1. Creates a Supabase server client with cookie access
2. Calls `supabase.auth.getUser()` to validate and refresh the session
3. Writes updated session cookies to the response

This means sessions are transparently refreshed on every request without any client-side polling.

### 3.2 Middleware Flow

```
Incoming request
  ↓
src/middleware.ts
  ↓
updateSession() — lib/supabase/middleware.ts
  ├─ Refreshes session cookie
  └─ Returns { user, supabaseResponse }
  ↓
Route access decision:
  ├─ Public route → pass through
  ├─ Authenticated + /login → redirect to /
  └─ Unauthenticated + protected route → redirect to /login (Cache-Control: private, no-store)
```

Middleware matcher excludes static assets (`_next/static`, `_next/image`, images, `favicon.ico`).

### 3.3 RBAC — Module Permission Matrix

Access control has two layers: a numeric **admin level** (seniority) and a per-**module**
**access right** (what you may do). The legacy system's `Operator - Detail → Access Right`
grid is the direct ancestor of the second.

**Admin levels** live in `admin_levels` and are referenced by `profiles.admin_level`.
Lower number = more privileged:

```
SUPER_ADMIN  = 0     STAFF        = 6
MANAGER      = 3     JUNIOR_STAFF = 7
SENIOR_STAFF = 4     BASIC        = 8
```

> `admin_levels.id` (1–6) and `admin_levels.level` (0,3,4,6,7,8) are different columns.
> `profiles.admin_level` is a foreign key to **`level`**. Always select `level`.

**Module rights** are `NONE (0)` / `READ (1)` / `WRITE (2)` across eight modules:
`dashboard`, `students`, `schools`, `events`, `exams`, `staff`, `reports`, `settings`.
An ordered scalar, not two booleans, so every check is one comparison and no combination
can contradict itself.

```
permission_modules            8 modules
admin_level_permissions       level defaults  (6 levels × 8 = 48 rows)
profile_permission_overrides  per-person deviations only
        ↓
resolve_permissions(profile_id)   coalesce(override, level default, NONE)
                                  level 0 short-circuits to WRITE
```

Only genuine deviations are stored as overrides, so changing a level default still
propagates to everyone who never deviated.

### 3.4 Resolution: per-request, not per-token

`custom_access_token_hook` (migration `065`) still injects `admin_level` into JWT
`app_metadata`, but the **permission map is not read from the token**. `getPermissions()`
calls `resolve_permissions` over the session client on each request, wrapped in React
`cache()` so repeat calls within one request cost a single query.

A claim would only refresh when the token does — up to an hour — so revoking someone's
access would not take effect until then. Per-request resolution is always current, and
costs the same as the profile lookup `getCurrentUser()` already performs.

Trade-off: this means the map is unavailable in middleware without a DB round-trip on
every navigation. Middleware therefore stays authentication-only, and authorisation
happens in server components and Server Actions, which already run server-side.

### 3.5 Enforcement points

| Layer | Mechanism | Coverage |
|---|---|---|
| Page | `requireAccess(module, level)` → redirect `/403` | 21 dashboard pages |
| Server Action | `assertAccess(module, level)` → `ActionResult` error | 106 exported actions |
| API route | `canAccess(...)` → 403 JSON | 3 export routes under `/api/` |
| Navigation | Sidebar filtered by resolved map in the dashboard layout | 8 top-level items |
| Buttons | `canAccess(module, WRITE)` gates create/edit affordances | list + detail pages |

`npm run check:permissions` fails the build if a page or action ships unguarded.

### 3.6 Privilege escalation controls

`staff:WRITE` would otherwise be equivalent to Super Admin — the holder could assign
themselves a higher level. Three separate guards, because there are three distinct routes:

- `assertNoEscalation()` — cannot grant a level or module access above your own
- `assertOutranksTarget()` — cannot act on a **more senior** colleague at all, checked
  against the target's current level in the database rather than the submitted payload.
  A payload that omitted `admin_level` would otherwise bypass the escalation check while
  still reaching the password and login-email updates
- `assertCanManageAccess()` — changing anyone's access rights needs Manager or above,
  on top of `staff:WRITE`

Peers may administer each other; only strictly more senior targets are protected. All
three run server-side in the actions — the UI merely mirrors them.

### 3.7 SECURITY NOTE — RLS is enabled but permissive

RLS **is** enabled on every public table (migration `075`), which stops anonymous access
via the publishable key. However, all ~197 policies grant `authenticated` unrestricted
read and write (`using (true)`). Any signed-in staff member can therefore still query any
table directly.

**This makes the application layer the only real gate.** Two consequences:

1. An unguarded page or action is a genuine data-exposure hole, not a style issue —
   hence the coverage script.
2. Actions using the service-role client (`admin.ts`) bypass RLS entirely. `staff.ts` and
   `permissions.ts` are in this category and their guards are especially load-bearing.

Tightening RLS to read the permission matrix is deliberate follow-up work, not an
oversight — see §9.

---

## 4. Data Access Layer

### 4.1 Three Supabase Clients

```
src/lib/supabase/
├── client.ts   — Browser (anon/publishable key). For client components that
│                 need reactive Supabase access. Rarely used — prefer Server Actions.
├── server.ts   — Server (cookie-based SSR). Used in Server Components, Server Actions,
│                 Route Handlers. Reads NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY.
└── admin.ts    — Service role. Bypasses RLS. Server-only. Used only in data migration
                  scripts and auth user creation flows. Never imported in client bundles.
```

### 4.2 Query / Action Separation

```
src/lib/supabase/
├── queries/    — READ ONLY. Plain async functions called from Server Components.
│                 Return typed data or null. No cache invalidation.
└── actions/    — WRITE ONLY. 'use server' functions. Return ActionResult<T>.
                  Call revalidatePath() after mutations.
```

One file per domain entity in each directory (e.g., `queries/students.ts`, `actions/students.ts`). This makes it immediately clear where to find data fetching vs mutations.

### 4.3 ActionResult Contract

All Server Actions return `ActionResult<T>`:

```typescript
type ActionResult<T = void> = {
  success: boolean
  data?: T
  error?: string   // human-readable error string for toast display
}
```

Client components read `result.success` and show `result.error` via sonner toast.

---

## 5. Database Architecture

### 5.1 Supabase Postgres

Hosted Supabase project (`aa-new`). 68 SQL migrations define the schema. Heavy use of reference/lookup tables for normalized categorical data.

### 5.2 Core Entity Tables

| Table | Description |
|---|---|
| `profiles` | Staff/user profiles. `id` FK to Supabase `auth.users`. Has `admin_level` and `department_id`. |
| `students` | Core student records. Has `student_code` (auto-generated, format `S####`). |
| `schools` | Partner schools. |
| `events` | Recruitment events. Parameterized by event type. |
| `student_contacts` | Emergency contacts for students. |
| `student_applications` | Student → School application records. |
| `student_education` | Prior education history. |
| `student_visas` | Visa records. |
| `student_travel` | Travel booking records. |
| `student_exam_results` | Exam scores per student. |
| `student_event_applications` | Student registration for specific events. |
| `student_internal_notes` | Staff-only notes on a student. |

### 5.3 Reference / Lookup Tables

Many fields reference small lookup tables rather than storing raw strings. Examples: `departments`, `gender_types`, `institution_types`, `phases`, `nationality`, `course_types`, `scholarship_types`, `application_statuses`, `event_types`. This was partially restructured in migrations 036–051 as the legacy data was normalized.

### 5.4 Event-Related Tables

| Table | Description |
|---|---|
| `event_representatives` | Links school contacts to events. `school_id` is nullable (migration 064). |
| `event_exam_blocks` | Structured exam session definitions within an event. |
| `event_school_mappings` | Which schools participate in a given event. |

### 5.5 School Sub-Entity Tables

`school_contacts`, `school_courses`, `school_fees`, `school_entrance_exams`, `school_academic_results`, `school_bank_details`, `school_supplementary_info`, `school_notes`, `school_visits`

### 5.6 Student Resume Tables

`student_resume`, `student_resume_profile`, `student_resume_talents`, `student_resume_aa_tests`, `student_legal_documents`

### 5.7 custom_access_token_hook

Migration `065_custom_access_token_hook.sql` installs a Postgres function that fires on every Supabase Auth token issuance. It reads `admin_level` from `profiles` for the authenticating user and injects it into `app_metadata` in the JWT. This makes RBAC checks possible without a database round-trip on every request.

---

## 6. Event Scheduler

The interactive scheduler (`events/[type]/[id]/scheduler/`) is one of the more complex client-side features. It manages drag-and-drop assignment of students to representative time slots within an event.

Key components:
- `event-scheduler.tsx` — top-level orchestrator; holds drag state
- `representative-tabs.tsx` — one tab per school representative
- `time-slot-grid.tsx` / `time-slot-items.tsx` — droppable time slot grid per representative
- `unassigned-sidebar.tsx` — list of students not yet assigned; drag source
- `assign-student-popover.tsx` — popover to manually pick a student for a slot
- `drag-overlay.tsx` — custom drag preview rendered by `@dnd-kit/core`
- `time-slot-utils.ts` — pure utility functions for time slot math

State mutations go through `actions/event-scheduler.ts` Server Actions. `@schedule-x` handles the underlying calendar rendering with drag-and-drop enabled by `@schedule-x/drag-and-drop`.

---

## 7. Document Export Architecture

Two client-facing documents are generated server-side: the Selected School List
(`src/lib/schools/`) and the student Brief Introduction (`src/lib/brief-intro/`).
Both follow the same layering, and a third export should copy it rather than invent
a variant.

```
queries/<name>-export.ts        ← batched reads, caps, { ok, payload } result
          │
          ▼
lib/<name>/export-shaping.ts    ← PURE. every fallback + format decision. unit tested
          │
   ┌──────┴──────┐
   ▼             ▼
build-export-    build-export-      ← 'server-only'
html.tsx         workbook.ts
   │                 │
   ▼                 ▼
lib/pdf/render-  exceljs buffer
document-pdf.ts
   │                 │
   ▼                 ▼
/api/.../pdf     /api/.../xlsx     ← auth → cap → render → private, no-store
```

**Rules that keep this working:**

1. **The PDF renderer is handed HTML, never a URL.** Headless Chromium carries no
   session and would be redirected to `/login`, and accepting a URL would open an
   SSRF surface. `renderDocumentPdf` is shared and takes a self-contained string.

2. **`outputFileTracingIncludes` in `next.config.ts` is keyed per route path.**
   Every new PDF route needs its own entry pointing at the Chromium `bin/` glob.
   Miss it and the route works locally — where Chrome is resolved from the
   developer's own installation — and fails only once deployed.

3. **Shaping is pure and separate.** No Supabase, no I/O, so the awkward cases
   (legacy fallbacks, HTML flattened for spreadsheet cells) are tested directly.

4. **Spreadsheet cells are written verbatim — do not "fix" this.** The reflex is to
   escape a leading `= + - @` against formula injection, but that mitigation belongs
   to CSV. A string written through ExcelJS lands as a String cell (ValueType 3) with
   no formula attached, so `=1+1` is already inert; the workbook tests round-trip the
   generated file to prove it. Prefixing an apostrophe would be actively harmful —
   ExcelJS stores it as a literal character rather than the OOXML `quotePrefix` style
   (which it drops), so it would show in the cell and corrupt any hobbies field a
   consultant began with a dash. Escape only if a CSV export is ever added.

5. **Documents name students, so responses are `Cache-Control: private, no-store`
   and failures are logged without the payload.**

Modules marked `'server-only'` are aliased to a stub in `vitest.config.ts` so they
keep the bundling guard while staying unit testable.

---

## 8. Legacy Data Migration Architecture

```
data/                    ← Source CSVs (AA_Student.csv, AA_School.csv, AA_Event*.csv, ...)
    │
    ▼
scripts/
    1_migrate-profiles.ts
    2_migrate-schools.ts
    ...                  ← 34 numbered scripts, run via tsx
    34_migrate-aa-test.ts
    │
    ▼
Supabase Postgres (via service-role admin client)
    │
    ▼
data/
    aa-test-migration-preview.json    ← Preview/dry-run artifacts
    school-courses-skipped.json       ← Skipped records log
```

`remigrate.sh` orchestrates re-running all scripts in order. Scripts use `papaparse` to parse CSVs and the admin Supabase client to write directly to Postgres. The `requirements/` directory holds legacy spec documents and database exports that served as the migration source of truth.

---

## 9. Deployment Architecture

The app is deployed as a standard Next.js application. Supabase is a hosted managed service — no self-hosted Postgres.

See `docs/deployment-guide.md` for environment variable setup and deployment steps.

---

## 10. Known Architectural Gaps

| Gap | Severity | Notes |
|---|---|---|
| RLS enabled but permissive | High | Migration `075` enabled RLS everywhere, but policies are `using (true)` for `authenticated`. App-layer guards are the real gate — see §3.7. Next step: policies that read `resolve_permissions` via a JWT claim |
| Thin test coverage | Medium | Vitest configured; 133 tests, concentrated on permissions and the export pipelines. No E2E |
| No CI/CD pipeline | Medium | No `.github/workflows/` found. `npm run check:permissions` is written and passing but not wired to CI |
| `/reports` not implemented | Low | Sidebar link exists, no page yet. `/settings` now has the Access Levels section |
| No permission audit log | Medium | Access-right changes are not recorded. Cheaper to add before the matrix is in real use than after |
| Env var naming inconsistency | Low | Server client reads `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY`; tooling/docs may still reference `NEXT_PUBLIC_SUPABASE_ANON_KEY` |
