# Codebase Summary

**Last updated:** 2026-06-24
**Stack:** Next.js 16 (App Router) + React 19 + TypeScript 5 + Supabase

---

## High-Level Numbers

| Metric | Value |
|---|---|
| Source files (src/) | ~236 files |
| Estimated LOC (src/) | ~37,600 |
| SQL migrations | 68 (001–068) |
| Server action files | 30 |
| Query files | 35+ |
| shadcn/ui primitives | 53 |
| Legacy migration scripts | 34 |

---

## Root Directory Layout

```
aa-new/
├── src/                  # Application source
├── supabase/
│   ├── migrations/       # 68 SQL migration files
│   └── config.toml       # Supabase project config (project_id: aa-new)
├── scripts/              # 34 data migration TypeScript scripts (run via tsx)
├── data/                 # Source CSVs + migration output artifacts
├── requirements/         # Legacy spec documents (Word/PDF) + DB exports
├── public/               # Static assets
├── components.json       # shadcn/ui config
├── next.config.ts
├── tsconfig.json
├── postcss.config.mjs
├── eslint.config.mjs
└── remigrate.sh          # Re-runs the full data migration pipeline
```

---

## src/ Directory Map

### app/ — Next.js App Router

```
src/app/
├── layout.tsx                     # Root layout: <Toaster />, globals.css
├── globals.css                    # Tailwind v4 global styles
├── (auth)/                        # Public auth routes (no sidebar/header)
│   ├── login/page.tsx
│   ├── forgot-password/page.tsx
│   └── reset-password/page.tsx
├── auth/
│   └── callback/route.ts          # Supabase OAuth/email-link callback handler
└── (dashboard)/                   # Protected routes — layout renders Sidebar + Header
    ├── layout.tsx                 # Loads getCurrentUser() server-side, renders shell
    ├── page.tsx                   # Dashboard home
    ├── students/
    │   ├── page.tsx               # Student list with filters
    │   ├── students-filters.tsx
    │   ├── student-form.tsx       # Shared create/edit form
    │   ├── new/page.tsx
    │   └── [id]/
    │       ├── page.tsx           # Student detail — assembles all sections
    │       ├── edit/page.tsx
    │       ├── student-contacts.tsx
    │       ├── student-education.tsx
    │       ├── student-applications.tsx
    │       ├── student-event-applications.tsx
    │       ├── student-exam-results.tsx
    │       ├── student-resume.tsx
    │       ├── student-resume-profile.tsx
    │       ├── student-visas.tsx
    │       ├── student-travel.tsx
    │       ├── student-brief-intro.tsx
    │       ├── student-internal-notes.tsx
    │       ├── student-legal-documents.tsx
    │       └── *-dialog.tsx       # One dialog per sub-entity (create/edit modals)
    ├── schools/
    │   ├── page.tsx
    │   ├── schools-filters.tsx
    │   ├── school-form.tsx
    │   ├── new/page.tsx
    │   └── [id]/
    │       ├── page.tsx
    │       ├── edit/page.tsx
    │       ├── school-contacts.tsx
    │       ├── school-courses.tsx
    │       ├── school-fees.tsx
    │       ├── school-entrance-exams.tsx
    │       ├── school-academic-results.tsx
    │       ├── school-bank-details.tsx
    │       ├── school-notes.tsx
    │       ├── school-visits.tsx
    │       └── *-dialog.tsx
    ├── staff/
    │   ├── page.tsx
    │   ├── staff-form.tsx
    │   ├── new/page.tsx
    │   └── [id]/page.tsx, edit/page.tsx
    ├── events/
    │   ├── page.tsx               # Events landing — upcoming event cards
    │   ├── upcoming-event-card.tsx
    │   └── [type]/                # Dynamic segment: expo, interview, audition, etc.
    │       ├── page.tsx           # Event list for given type
    │       ├── events-filters.tsx
    │       ├── event-form.tsx     # Shared event create/edit form
    │       ├── event-form-*.tsx   # Form split into section components
    │       ├── event-form-types.ts
    │       ├── new/page.tsx
    │       └── [id]/
    │           ├── page.tsx       # Event detail
    │           ├── edit/page.tsx
    │           ├── delete-event-dialog.tsx
    │           └── scheduler/    # Interactive interview/exam scheduler
    │               ├── event-scheduler.tsx
    │               ├── time-slot-grid.tsx
    │               ├── time-slot-items.tsx
    │               ├── time-slot-utils.ts
    │               ├── assign-student-popover.tsx
    │               ├── unassigned-sidebar.tsx
    │               ├── representative-tabs.tsx
    │               └── drag-overlay.tsx
    └── exams/
        ├── page.tsx
        └── exam-management-table.tsx
```

### components/ — Shared Components

```
src/components/
├── ui/                           # 53 shadcn/ui primitives
│   ├── button.tsx, input.tsx, select.tsx, dialog.tsx, ...
│   └── sonner.tsx                # Toast wrapper
└── layout/
    ├── sidebar.tsx               # App navigation sidebar
    └── header.tsx                # Top header bar
```

### lib/ — Business Logic & Data Access

```
src/lib/
├── utils.ts                      # cn() — Tailwind class merge (clsx + tailwind-merge)
├── auth-utils.ts                 # ADMIN_LEVELS constants, hasMinLevel(), getAdminLevel()
├── permissions/                  # Module access rights — the enforcement core
│   ├── modules.ts                # MODULES/ACCESS constants, PermissionMap, denyAll()
│   ├── resolve.ts                # getPermissions() — per-request, React cache(), fails closed
│   ├── guard.ts                  # requireAccess / assertAccess / canAccess / assertNoEscalation
│   ├── route-map.ts              # moduleForPath() — pathname → module (pure)
│   └── __tests__/                # 30 tests: route-map, guard, seed parity, resolver
└── supabase/
    ├── client.ts                 # Browser Supabase client (anon/publishable key)
    ├── server.ts                 # Server component client (cookie SSR)
    ├── admin.ts                  # Service-role client — server-only
    ├── middleware.ts             # updateSession() — refreshes session cookies per request
    ├── auth.ts                   # getCurrentUser() → { id, email, first_name, surname, department_label, admin_level }
    ├── actions/                  # 'use server' mutation files — one per domain
    │   ├── students.ts           # createStudent, updateStudent, deleteStudent; ActionResult<T> defined here
    │   ├── schools.ts
    │   ├── staff.ts
    │   ├── events.ts
    │   ├── event-scheduler.ts
    │   ├── event-representatives.ts
    │   ├── event-exam-blocks.ts
    │   ├── auth.ts               # signIn, signOut, resetPassword actions — the only unguarded action file
    │   ├── permissions.ts        # setProfilePermissions, setLevelPermissions (service-role + anti-escalation)
    │   ├── student-applications.ts
    │   ├── student-application-deposits.ts
    │   ├── student-education.ts
    │   ├── student-visas.ts
    │   ├── student-event-applications.ts
    │   ├── student-exam-results.ts
    │   ├── student-individual-exams.ts
    │   ├── student-travel.ts
    │   ├── student-brief-intro.ts
    │   ├── student-internal-notes.ts
    │   ├── student-documents.ts
    │   ├── student-resume.ts
    │   ├── student-resume-profile.ts
    │   ├── student-resume-talents.ts
    │   ├── student-resume-aa-tests.ts
    │   ├── school-contacts.ts
    │   ├── school-courses.ts
    │   ├── school-fees.ts
    │   ├── school-entrance-exams.ts
    │   ├── school-academic-results.ts
    │   ├── school-bank-details.ts
    │   ├── school-notes.ts
    │   └── school-visits.ts
    └── queries/                  # Read-only data fetching for Server Components
        ├── students.ts
        ├── schools.ts
        ├── staff.ts
        ├── events.ts
        ├── event-scheduler.ts
        ├── event-reference-queries.ts
        ├── exam-management.ts
        ├── student-applications.ts
        ├── student-application-deposits.ts
        ├── student-education.ts
        ├── student-event-applications.ts
        ├── student-brief-intro.ts
        ├── school-contacts.ts
        ├── school-courses.ts
        ├── school-fees.ts
        ├── school-entrance-exams.ts
        ├── school-academic-results.ts
        ├── school-bank-details.ts
        ├── school-notes.ts
        ├── school-supplementary-info.ts
        └── school-visits.ts
```

### types/ — TypeScript Types

```
src/types/
├── database.ts          # Supabase-generated types (npm run db:types)
└── database.types.ts    # Extended/aliased types (StudentInsert, StudentUpdate, etc.)
```

### hooks/

```
src/hooks/
└── use-mobile.ts        # Responsive breakpoint hook
```

---

## Database Migrations Overview

Migrations are in `supabase/migrations/` numbered `001` through `068`.

| Range | Theme |
|---|---|
| 001–020 | Create reference/lookup tables + core entity tables (profiles, schools, students, events, applications, education, visa, travel, exam results) |
| 021–035 | Create school sub-entity tables (courses, fees, entrance exams, academic results, bank details, contacts, supplementary info, notes, visits), student log book, brief intro, resume, visits, officers, predeparture, enquiries |
| 036–051 | Data normalization: consolidate gender types, institution types, phases, religious affiliations, split/merge fields, remap categories, add scholarship types |
| 052–060 | Lead source restructure, visit fields on applications, new event types, consolidate event types, add application_id to individual exams, create internal notes, school intro approval, resume fields and documents |
| 061–068 | Resume profile/talents tables, event application status updates, year group on applications, nullable school_id on representatives, custom_access_token_hook (RBAC), schedule blocker, school_contact_id on representatives, is_active on school contacts |

---

## Legacy Migration Scripts (`scripts/`)

34 TypeScript scripts numbered by dependency order, run via `tsx`:

- `1_migrate-profiles.ts` — staff profiles from CSV
- `2_migrate-schools.ts` — school records
- `3_migrate-school-contacts.ts`
- `4_migrate-school-courses.ts`
- `5_migrate-students.ts`
- `6_migrate-student-contacts.ts`
- `7_migrate-events.ts`
- `8_migrate-event-school-representatives.ts`
- `9_migrate-event-applications.ts`
- `10_migrate-event-results.ts` through `34_migrate-aa-test.ts`

Source CSVs (`data/`): `AA_Student.csv`, `AA_School.csv`, `AA_Event*.csv`, and others.

---

## Key Dependencies

| Package | Purpose |
|---|---|
| `next` 16.0.10 | App framework |
| `react` 19.2.1 | UI |
| `@supabase/supabase-js` ^2.47 | Supabase client |
| `@supabase/ssr` ^0.5 | Cookie-based SSR sessions |
| `react-hook-form` ^7.68 | Form state management |
| `zod` ^3.25 | Schema validation |
| `@schedule-x/*` v4 | Calendar/scheduler UI |
| `@dnd-kit/core` ^6.3 | Drag-and-drop for event scheduler |
| `recharts` ^2.15 | Charts |
| `sonner` ^2.0 | Toast notifications |
| `papaparse` ^5.5 | CSV parsing in migration scripts |
| `lucide-react` ^0.561 | Icon set |
| `date-fns` ^4.1 | Date utilities |
| `tsx` ^4.21 | Run TypeScript migration scripts directly |
