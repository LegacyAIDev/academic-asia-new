# Academic Asia — Project Overview & Product Development Requirements (PDR)

**Last updated:** 2026-06-24
**Version:** 0.1.0
**Status:** Active development — rebuild phase

---

## 1. Project Overview

Academic Asia is an internal Student Management / CRM platform built for an international education-recruitment agency. The agency recruits students from Asia (primarily Hong Kong and mainland China) and places them into partner schools abroad. The platform manages every touchpoint of that workflow: prospective student intake, school/course catalog management, staff coordination, and the logistics of recruitment events (expos, interviews, auditions, group entrance exams, seminars, briefings, and scholarship assessments).

This codebase is a full rebuild of a legacy system. The legacy data (students, schools, events, staff, applications) was exported as CSVs and is being migrated into a new Supabase Postgres database via a set of numbered TypeScript migration scripts in `scripts/`.

### 1.1 Core Business Objects

| Object | Description |
|---|---|
| **Student** | Prospective and enrolled students. Core entity — has contacts, education history, visa info, travel records, exam results, applications, resume, and event registrations. |
| **School** | Partner schools. Has contacts, courses, fees, entrance exams, academic result requirements, bank details, and visit logs. |
| **Staff** | Agency staff members assigned to students and events. Differentiated by admin level and department. |
| **Event** | Recruitment events parameterized by type: `expo`, `interview`, `audition`, `group-exam`, `seminar`, `briefing`, `assessment`, `scholarship`. Each has school representatives, exam blocks, and an interactive scheduler for assigning students to time slots. |
| **Application** | A student's formal application to a school/course via an event. Tracks status, scholarship eligibility, deposits, and year-group placement. |
| **Exam** | Standalone and event-linked entrance exams with per-student results. |

---

## 2. Functional Requirements

### 2.1 Authentication & Authorization

- **FR-AUTH-01**: All non-public routes must require an active Supabase session. Unauthenticated access redirects to `/login`.
- **FR-AUTH-02**: Session persistence via cookie-based SSR using `@supabase/ssr`. Session must refresh automatically on each request via middleware.
- **FR-AUTH-03**: Role-based access control (RBAC) via numeric admin levels stored in JWT `app_metadata`. Levels: SUPER_ADMIN (0), MANAGER (3), SENIOR_STAFF (4), STAFF (6), JUNIOR_STAFF (7), BASIC (8). Lower number = more privileged.
- **FR-AUTH-04**: Admin level must be injected at token-issuance time via a Postgres `custom_access_token_hook` so it is available without a DB round-trip.
- **FR-AUTH-05**: Password reset flow via email (forgot-password → reset-password with Supabase OTP token).

### 2.2 Student Management

- **FR-STU-01**: Create, read, update, delete students with a generated student code (format: `S` + zero-padded integer).
- **FR-STU-02**: Student profile: personal info, contact details, present school, course preference, enrollment date, lead source, assigned staff, status, placement.
- **FR-STU-03**: Student sub-entities (each independently editable): contacts, education history, visa records, travel records, exam results, event applications, application deposits, application exam entries, brief intro, internal notes, legal documents, resume (profile + talents + AA tests).
- **FR-STU-04**: Filterable, searchable student list.
- **FR-STU-05**: Lead source tracking: category + optional referral detail or event linkage.

### 2.3 School Management

- **FR-SCH-01**: Create, read, update, delete schools with sub-entities: contacts, courses, fees, entrance exams, academic result requirements, bank details, supplementary info, visit logs, notes.
- **FR-SCH-02**: School contacts have an `is_active` flag and can be linked to event representatives.
- **FR-SCH-03**: Filterable, searchable school list.
- **FR-SCH-04**: Course catalog per school with intake year/month, fee structures, and scholarship types.

### 2.4 Staff Management

- **FR-STA-01**: Create, read, update, delete staff profiles linked to Supabase auth users (via `profiles` table).
- **FR-STA-02**: Staff differentiated by department and admin level.
- **FR-STA-03**: Filterable staff list.

### 2.5 Event Management

- **FR-EVT-01**: Events are parameterized by type. Supported types: `expo`, `interview`, `audition`, `group-exam`, `seminar`, `briefing`, `assessment`, `scholarship`. Also `briefing` and `reception` (added in migration 054).
- **FR-EVT-02**: Event form sections: basic info, date/time, location, schools, representatives, exam blocks, admission config, remarks.
- **FR-EVT-03**: Event representatives link school contacts to events. `school_id` is nullable on representatives (migration 064).
- **FR-EVT-04**: Exam blocks define structured exam sessions within an event.
- **FR-EVT-05**: Interactive scheduler for interview/exam events: drag-and-drop student assignment to representative time slots. Unassigned students sidebar + drag overlay.
- **FR-EVT-06**: Event application status lifecycle managed per student.
- **FR-EVT-07**: Filterable event list per type with upcoming event cards on the events landing page.

### 2.6 Exam Management

- **FR-EXM-01**: Standalone exam management table aggregating individual exam results across students and events.
- **FR-EXM-02**: Individual student exam entries linkable to applications (migration 056).

### 2.7 Data Migration (Legacy System)

- **FR-MIG-01**: 34 numbered TypeScript migration scripts in `scripts/` import legacy CSV data from `data/` into Supabase.
- **FR-MIG-02**: Migration is re-runnable via `remigrate.sh` with idempotency handled per-script.
- **FR-MIG-03**: Migration artifacts (previews, skipped records) are written to `data/` (e.g., `aa-test-migration-preview.json`, `school-courses-skipped.json`).

---

## 3. Non-Functional Requirements

### 3.1 Performance

- **NFR-PERF-01**: Server Components for all data-heavy pages; client components only for interactive UI (forms, dialogs, drag-and-drop).
- **NFR-PERF-02**: `revalidatePath` called after every mutation to keep cached data fresh without full page reloads.
- **NFR-PERF-03**: Queries and actions are split into separate files to keep bundle size predictable.

### 3.2 Security

- **NFR-SEC-01**: Service role Supabase client (`admin.ts`) used only server-side; never exposed to browser bundles.
- **NFR-SEC-02**: All protected routes gated by Next.js middleware; no security relies solely on client-side navigation guards.
- **NFR-SEC-03**: Session cookies set with `private, no-store` Cache-Control on redirect responses to prevent caching of auth state.
- **NFR-SEC-04 (OPEN RISK)**: Row-Level Security (RLS) is not currently enabled at the database level. Access control is enforced at the application layer only. RLS policies should be added before any public or multi-tenant exposure. See `system-architecture.md` for detail.

### 3.3 Maintainability

- **NFR-MAINT-01**: File size target under 200 lines per file. Large screens split into per-section and per-dialog components (students and schools detail pages are the canonical patterns).
- **NFR-MAINT-02**: kebab-case file names throughout.
- **NFR-MAINT-03**: `@/*` path alias maps to `src/*` — no relative `../../` imports.
- **NFR-MAINT-04**: TypeScript types generated from the live database schema via `npm run db:types`.

### 3.4 Developer Experience

- **NFR-DX-01**: Single `npm run dev` to start. No separate backend process needed for the app (Supabase is hosted).
- **NFR-DX-02**: `tsx` for running migration scripts without a separate compile step.
- **NFR-DX-03**: ESLint 9 + TypeScript strict mode enforced pre-commit.

---

## 4. Technical Constraints

- Next.js App Router only — no Pages Router patterns.
- All database interactions go through Supabase (no direct ORM/Prisma).
- UI components must use the existing shadcn/ui primitives. New primitives added via `shadcn add <component>`, not hand-written from scratch.
- Forms must use react-hook-form + zod. No uncontrolled form patterns.
- Tailwind CSS v4 only — no CSS modules, no styled-components.

---

## 5. Planned / Not Yet Built

The following items are inferred from codebase signals (sidebar links without backing pages, noted gaps):

| Feature | Status | Signal |
|---|---|---|
| `/settings` page | Planned | Sidebar link present, no `page.tsx` found |
| `/reports` page | Planned | Sidebar link present, no `page.tsx` found |
| Database-level RLS policies | Planned | No `CREATE POLICY` found in any migration |
| Automated test suite | Not started | No test runner config found (Jest, Vitest, Playwright) |
| CI/CD pipeline | Not started | No `.github/workflows/` found |

---

## 6. Acceptance Criteria (Current Phase)

The rebuild is considered functionally complete for the current phase when:

1. All legacy data is successfully migrated — no records in skipped/error artifacts.
2. Auth flow (login, forgot-password, reset-password, session refresh) works end-to-end.
3. Full CRUD for students, schools, staff, and events (all types) is functional.
4. Event scheduler drag-and-drop assigns students to time slots without data loss.
5. Exam management table accurately reflects all exam results.
6. TypeScript compiles with zero errors (`npm run type-check`).
7. ESLint reports zero errors (`npm run lint`).
