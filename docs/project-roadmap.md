# Project Roadmap

**Last updated:** 2026-06-24
**Current phase:** Phase 2 — Feature Completion

> Items marked as "Inferred" are based on codebase signals (sidebar links, migration patterns, absence of test/CI config) and not from explicit specifications.

---

## Phase 1 — Foundation & Core Entities

**Status: Complete**

- [x] Next.js 16 App Router project setup with Supabase
- [x] Authentication: login, forgot-password, reset-password flows
- [x] Middleware-based route protection with session refresh
- [x] RBAC via custom JWT hook (admin levels: SUPER_ADMIN → BASIC)
- [x] Dashboard shell: Sidebar + Header with current user context
- [x] Database schema: 68 SQL migrations (core entities + reference tables)
- [x] Student CRUD: list, detail, new, edit with all sub-entities (contacts, education, visas, travel, exam results, applications, event applications, resume, brief intro, internal notes, legal documents)
- [x] School CRUD: list, detail, new, edit with all sub-entities (contacts, courses, fees, entrance exams, academic results, bank details, notes, visits, supplementary info)
- [x] Staff CRUD: list, detail, new, edit
- [x] Event management: all event types (expo, interview, audition, group-exam, seminar, briefing, assessment, scholarship) with full form (basic, datetime, location, schools, representatives, exam blocks, admission, remarks)
- [x] Event scheduler: drag-and-drop student assignment to representative time slots
- [x] Exam management table

---

## Phase 2 — Data Migration & Stabilization

**Status: In Progress**

- [x] 34-script legacy data migration pipeline (`scripts/`, `remigrate.sh`)
- [x] Source CSV parsing (papaparse)
- [x] School contacts `is_active` flag (migration 068)
- [x] Schedule blocker support (migration 066)
- [x] Event application status updates (migration 062)
- [x] Year group on applications (migration 063)
- [ ] Full migration run with zero skipped/error records — verify `data/school-courses-skipped.json` and `data/aa-test-migration-preview.json` are clean
- [ ] Data quality review: cross-check migrated records against legacy CSV counts

---

## Phase 3 — Security Hardening

**Status: Planned** *(Inferred — no RLS found in any migration)*

- [ ] Implement Row-Level Security (RLS) policies on all Postgres tables
  - `profiles`: users can only read their own profile; managers can read all
  - `students`, `schools`, `events`: staff can read all; mutations restricted by admin level
  - `student_internal_notes`: restrict by department or admin level
- [ ] Audit service-role client usage — confirm `admin.ts` is never imported in client bundles
- [ ] Review and tighten Supabase Auth redirect URL allowlist in `config.toml`

---

## Phase 4 — Testing & Quality

**Status: Planned** *(Inferred — no test runner config found)*

- [ ] Set up test runner (Vitest recommended for Next.js 16 + TypeScript)
- [ ] Unit tests for utility functions: `hasMinLevel`, `getAdminLevel`, `cn`, time-slot utils
- [ ] Unit tests for Server Action input validation (zod schemas)
- [ ] Integration tests for Server Actions (mock Supabase client)
- [ ] E2E tests for critical flows (login, create student, create event, assign student to scheduler) via Playwright

---

## Phase 5 — Missing Pages & Features

**Status: Planned** *(Inferred from sidebar links without backing pages)*

- [ ] `/settings` — user profile settings, password change, notification preferences
- [ ] `/reports` — operational reports: student pipeline, school application stats, event attendance

---

## Phase 6 — CI/CD & DevOps

**Status: Planned** *(Inferred — no `.github/workflows/` found)*

- [ ] GitHub Actions workflow: lint + type-check on PR
- [ ] GitHub Actions workflow: run test suite on PR
- [ ] Staging environment with separate Supabase project
- [ ] Production deployment pipeline with migration auto-apply
- [ ] Environment-specific Supabase config (staging vs production)

---

## Phase 7 — Performance & Polish

**Status: Future**

- [ ] Pagination on student/school/staff list pages (currently loads all records)
- [ ] Optimistic UI updates for common mutations (reduce perceived latency)
- [ ] Audit Server Component vs Client Component split for bundle size
- [ ] Image/file upload for student documents and resume assets
- [ ] Export to CSV/Excel for student lists and reports

---

## Backlog (Unscheduled)

- Dark mode refinement (next-themes is installed but not prominently tested)
- Mobile responsiveness audit (use-mobile hook exists; full mobile QA not done)
- Internationalisation / Chinese language support (student profiles have `chinese_name` and `chinese_address` fields)
- Bulk operations on student list (bulk assign staff, bulk status update)
- Email notifications for application status changes
