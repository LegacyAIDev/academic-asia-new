# System Architecture

**Last updated:** 2026-06-24

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

### 3.3 RBAC

Access levels are numeric integers stored in the `profiles` table and injected into JWT `app_metadata` by a Postgres function hook (`custom_access_token_hook`, migration `065`). Lower number = more privileged.

```
SUPER_ADMIN = 0
MANAGER     = 3
SENIOR_STAFF = 4
STAFF       = 6
JUNIOR_STAFF = 7
BASIC       = 8
```

The hook fires on every token issuance/refresh, so `session.user.app_metadata.admin_level` always reflects the current database value. Guards use `hasMinLevel(userLevel, requiredLevel)` which evaluates `userLevel <= requiredLevel`.

### 3.4 SECURITY NOTE — No Database-Level RLS

Row-Level Security (RLS) is not currently enabled on any Supabase table. All access control is enforced at the application layer:
- Middleware blocks unauthenticated requests before they reach any data-fetching code.
- Server Actions can check `admin_level` before executing mutations.
- The service-role client (`admin.ts`) is restricted to server-only files.

**Risk**: If an application-layer bug bypasses the middleware or a Server Action skips the permission check, the Supabase Postgres database would return data regardless of the requesting user's identity. RLS policies should be implemented before any multi-tenant or externally exposed deployment.

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

## 7. Legacy Data Migration Architecture

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

## 8. Deployment Architecture

The app is deployed as a standard Next.js application. Supabase is a hosted managed service — no self-hosted Postgres.

See `docs/deployment-guide.md` for environment variable setup and deployment steps.

---

## 9. Known Architectural Gaps

| Gap | Severity | Notes |
|---|---|---|
| No RLS at DB level | High | All access control is application-layer only |
| No automated tests | Medium | No Jest/Vitest/Playwright configuration found |
| No CI/CD pipeline | Medium | No `.github/workflows/` found |
| `/settings` and `/reports` not implemented | Low | Sidebar links exist, no pages yet |
| Env var naming inconsistency | Low | Server client reads `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY`; tooling/docs may still reference `NEXT_PUBLIC_SUPABASE_ANON_KEY` |
