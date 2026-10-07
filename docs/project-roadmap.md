# Project Roadmap

**Last updated:** 2026-09-28
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

## Phase 4a — Scheduler v1

**Status: Implemented 2026-09-28**

- [x] Rooms + locations admin page (`/scheduler/rooms`) — capacity, facilities, active flag
- [x] Calendar page (`/scheduler`) — my / team / rooms views on FullCalendar v7 Premium
- [x] Bookings with capacity guard + seat assignment (exclusion constraint), reason-required cancel
- [x] Availability check while booking (`scheduler_free_busy`, `scheduler_available_rooms`)
- [x] Exam scheduling single write path — date/time/room/seat only via scheduler RPCs, `updateExamFields` narrowed to score/remarks
- [x] Student detail calendar tab (`student-calendar-section.tsx`)
- [x] Booking history / audit trail (`scheduler_booking_history`, trigger-written)
- [x] `scheduler` permission module (0/3/4/6 write, 7/8 read; confirm + rooms/locations CRUD require EXAMS WRITE)

**Deferred to v2 backlog** (customer scope cut, 2026-09-26):
- Recurring availability rules / lunch-break blocked times
- Legacy `AA_Scheduler.csv` import (folded into the data-migration workstream)
- Excel exports (rooms list, bookings-in-range)
- Copy-as-text (booking text, family-ready exam text)
- Team view people-as-columns layout (overlay view covers this in v1)
- Resource timeline week view
- Microsoft 365 calendar sync — feasibility note only, not implemented

**Open items before go-live:**
- [ ] Purchase FullCalendar Premium license ($480/yr) and set `NEXT_PUBLIC_FULLCALENDAR_LICENSE_KEY` — currently on evaluation key
- [ ] Run a production build to confirm the scheduler module compiles clean end-to-end
- [ ] Load real room inventory (current rooms are placeholder/seed data, not the full AA Centre list)

See `docs/system-architecture.md` §6a and `plans/260912-0136-scheduler-rooms-meetings-exams/plan.md` for design detail.

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

---

## Changelog

- **2026-09-28** — Scheduler v1: rooms/locations admin, my/team/rooms calendar (FullCalendar v7
  Premium), room + staff bookings with capacity/seat conflict handling, exam scheduling single
  write path, student calendar tab, booking history. See Phase 4a above.
- **2026-10-02** — Scheduler review hardening + visual pass: scheduler RPCs revoked from
  public/anon and granted to authenticated only; `scheduler_record_attendance` RPC (show_up
  completes the linked exam); trigger clears a booking's `exam_id` when it stops being an
  examination type; calendar view now shows completed exams as confirmed; availability lookups
  capped at 62-day ranges and URL ids validated as UUIDs before hitting PostgREST; new dashboard
  "pending exam bookings" card (spec NOT-01); room chip design system (`room-chip.tsx`,
  `booking-status-badge.tsx`, `booking-form-section.tsx`) rolled out across rooms admin, booking
  dialogs, and the details ribbon.
