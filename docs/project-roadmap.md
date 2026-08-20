# Project Roadmap

**Last updated:** 2026-08-20
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

**Status: In Progress**

- [x] Enable RLS on every public table (migration `075`) — stops anonymous access
- [x] **Module permission matrix** — level defaults + per-staff overrides, replacing the
      legacy `Operator - Detail → Access Right` grid
  - [x] Schema: `permission_modules`, `admin_level_permissions`,
        `profile_permission_overrides`, `resolve_permissions()`
  - [x] Core library `src/lib/permissions/` — per-request resolution, fails closed
  - [x] Enforcement: 21 pages, 106 server actions, 1 API route, sidebar, write buttons
  - [x] Anti-escalation rules so `staff:WRITE` cannot self-promote to Super Admin
  - [x] Staff access-rights grid + `/settings/access-levels` editor
  - [x] `npm run check:permissions` coverage gate
- [x] Fixed: `getAdminLevels()` returned `admin_levels.id` into a column keyed on
      `level`, so saving a staff member either failed the FK or silently granted the
      wrong level. Also `hasMinLevel(0, …)` denied Super Admins (falsy zero)
- [ ] **Tighten RLS policies** — all ~197 are still `using (true)` for `authenticated`,
      so app-layer guards remain the only real gate. Needs the permission map in a JWT
      claim for Postgres to read
- [ ] Permission audit log — record who changed whose access, and when
- [ ] Audit service-role client usage — confirm `admin.ts` is never imported in client bundles
- [ ] Review and tighten Supabase Auth redirect URL allowlist in `config.toml`

---

## Phase 4 — Testing & Quality

**Status: In Progress**

- [x] Test runner: Vitest, scoped to `src/**` (76 tests passing)
- [x] Unit + integration tests for the permission layer (30 tests)
- [ ] Unit tests for remaining utilities: `getAdminLevel`, `cn`, time-slot utils
- [ ] Unit tests for Server Action input validation (zod schemas)
- [ ] Integration tests for Server Actions (mock Supabase client)
- [ ] E2E tests for critical flows (login, create student, create event, assign student to scheduler) via Playwright

---

## Phase 5 — Missing Pages & Features

**Status: Planned** *(Inferred from sidebar links without backing pages)*

- [x] `/settings` — shell + Access Levels editor
- [ ] `/settings` — remaining sections: profile settings, password change, notifications
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
