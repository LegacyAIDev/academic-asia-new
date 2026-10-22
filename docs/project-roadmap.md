# Project Roadmap

**Last updated:** 2026-10-22
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

- [x] Test runner: Vitest, scoped to `src/**` (36 files, 543 tests passing)
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
- [x] Customer feedback round 1 (2026-10-09): team person columns, copy details + family exam text, right-click menu, date picker, cancelled filter fix, return-to-calendar state, view-only hint, staff guide (`docs/scheduler-user-guide.md`) — see changelog

**Exam desk (plan `261012-0011-exam-desk-papers-cover-slip`):**
- [x] Phase 1 (2026-10-12): `/exams` exam desk with date range, filters, sorting, Booked / Showed up lists, Confirm / Showed up / No show; previous list kept as `/exams?view=all` with a date filter. Unit tested; not yet checked in a browser with real exam bookings
- [x] Phase 2 (2026-10-12), part A, app layer: exam paper files restricted to the exam team (Exams WRITE). Not yet checked in a browser with two accounts; database policies (part B) postponed. Limit: Supabase API access with the browser key could still read papers, see `docs/system-architecture.md` §5.7
- [x] Phase 3 (2026-10-12): choose papers on the booking, paper availability on the desk, "Print available", "Do not store – request from school" (migration `20261011234555`). Implemented; not yet checked in a browser
- [x] Phase 4 (2026-10-12): cover slip PDF from the exam desk row. Implemented, layout provisional (customer template not shared); not yet checked in a browser or on a preview. Chinese fonts on the server unverified. Database protection of paper files (phase 2 part B) remains postponed

**Deferred to v2 backlog** (customer scope cut, 2026-09-26):
- Recurring availability rules / lunch-break blocked times
- Legacy `AA_Scheduler.csv` import (folded into the data-migration workstream)
- Excel exports (rooms list, bookings-in-range)
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

### Customer item 5 — Family information: family members linked to students

Plan `261022-1715-family-members-linked-to-students`.

- [x] Phase 1 (2026-10-22): data and server side. `student_contacts.related_student_id`, student search for the picker, link-aware create/update/delete contact, both-ways read query. See system-architecture 5.2b.
- [ ] Phase 2: Family tab (parents, siblings, others) and student picker in the contact form.
- [ ] Phase 3: possibly-family suggestions.

---

### Customer item 6 — Academic History: current school from a predefined list

Plan `261021-2210-current-school-from-predefined-list`.

- [x] Phase 1 (2026-10-22): table `present_schools`, `students.present_school_id`, name helper, import script 43. 1,230 schools; 11,938 of 23,547 students with a school linked to 517 schools; 11,610 unlinked.
- [x] Phase 2 (2026-10-22): "Current School" picker in the student form with "Add to list"; the list name is copied into `present_school` on save. Browser check by the user pending. See system-architecture 5.2a.
- [x] Phase 3 (2026-10-22): "Current Schools" page (`/students/present-schools`) to see, search, add and rename present schools; a rename updates linked students. Browser check by the user pending.

Open questions for Jack:
1. Keep all 1,230 schools? The requirement said 200-300.
2. May any staff with Students WRITE add schools to the list?
3. Fix the 11,610 unlinked students as staff edit them, or run a one-off mapping of the most common names?

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

- **2026-10-22** — Family members linked to students, phase 1 (customer item 5): migration `20261022152919` adds `student_contacts.related_student_id` (FK `students`, on delete set null, no self-link, unique per student and link). One row shown both ways (no mirrored row). The linked student's name is copied into the contact so it survives deletion. New `student-family` query/action (search, links to a student), `family-relationships.ts`, `student-search.ts`; contact actions refuse self-link and duplicates. `student_contacts` now has two FKs to `students`: embeds must name the FK. No UI yet. Details: system-architecture 5.2b.
- **2026-10-22** — Current school from a predefined list, phase 1 (customer item 6): new table `present_schools` and `students.present_school_id` (migration `20261021204752`), name helper `src/lib/students/present-school-name.ts`, import script `scripts/43_import-present-schools.ts`. Typed `present_school` text unchanged. 1,230 schools loaded; 11,938 of 23,547 students linked. Details: system-architecture 5.2a, deployment guide 5a. 
- **2026-10-22** — Current school from a predefined list, phase 2 (customer item 6): searchable "Current School" picker in the student form (`present-school-picker.tsx`) with "Add to list" (`addPresentSchool`, Students WRITE). Saving copies the list name into `present_school`; unlinked students keep their old text until chosen. Browser check pending. Details: system-architecture 5.2a.
- **2026-10-22** — Current school from a predefined list, phase 3 (customer item 6): "Current Schools" page at `/students/present-schools` (Students READ to view, WRITE to add/edit) with search, source filter, student counts, add and rename (`createPresentSchool`, `updatePresentSchool`). A rename replaces the old name and updates linked students' `present_school`. Re-running import script 43 after renames would re-add the original names (deployment guide 5a). Browser check pending. Details: system-architecture 5.2a.
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
- **2026-10-11** — Scheduler review hardening: dashboard card links to the Rooms week of the earliest pending exam; shared cancel rule (`canCancelBooking`); logged, batched people/attendee lookups; return links from Exams and student pages; query-wiring tests; helper consolidation (`personName`, `isUuid`, `isExamBooking`); date picker month/year dropdowns.
- **2026-10-09** — Scheduler customer feedback round 1:
  - Cancelled status filter now shows cancelled bookings (read from `scheduler_bookings`, the
    calendar view only holds active ones); people filter shared between both queries.
  - "Back to calendar" keeps view, mode, date and filters (`?from=`, scheduler paths only).
  - Month-day click books 09:00-10:00; a single click in the time grid books 60 minutes.
  - Team day/week views show one column per selected person; clicking a column pre-fills the
    colleague or student. Month stays an overlay.
  - Date label opens a month picker.
  - Right-click menu on bookings (open, edit, confirm, cancel, copy) and empty slots (new booking
    here, go to today), role-aware.
  - Copy details (CAL-09) and Copy for family on exams (CAL-10), on the details panel, booking
    page and right-click menu.
  - "View only" badge + disabled New booking with tooltip for users without scheduler write.
  - Staff-facing guide added: `docs/scheduler-user-guide.md`.
  - Bug fix: FullCalendar v7 ignored event colours and state classes (v6 field names
    `backgroundColor`/`borderColor`/`classNames` are stored as custom data in v7; now `color` +
    space-separated `className`) and resource order (`resourceOrder="order"`).
- **2026-10-20** — Application detail page, phases 1-2, and school page restructure, phase 3 (customer items 7 and 8; plan `261012-2115-application-detail-page-and-school-profile-layout`):
  - New page `/students/{id}/applications/{applicationId}` replaces the application popup (removed). Students READ to view, WRITE to edit or change status; 404 if the application is not the student's.
  - Header with status and sub-status, six-step journey (Preparing to Family decision; Placed / Closed outcome), full record, deposits, entrance exams, scheduler bookings (Scheduler READ only), read-only attachments, student card, timeline.
  - Status control groups statuses by journey step and saves status plus sub-status together; `updateStudentApplication` now scoped by application and student.
  - Student Applications tab: school name and eye icon open the page; Create/Edit/Delete only with WRITE. Scheduler booking "Application" link points to the page.
  - **Assumption:** the status-to-step mapping (50 statuses) is a working one, customer confirmation pending. Unit tested; not yet checked in a browser. The school profile layout (customer item 8) is a later phase of the same plan.
  - Phase 2, status history: new table `student_application_status_history` (migrations `20261020110718`, `20261020133120`), filled by a database trigger on every status or sub-status change (who, when, from, to). Timeline shows "Status: A → B" with the person, in Hong Kong time. No backfill: history starts 20 Oct 2026, noted on the page. Select-only RLS. Bulk imports of applications need the trigger disabled (deployment guide). Suite: 939 tests.
  - Phase 3, school page (customer item 8, part 1): `/schools/{id}` tabs are now plain links in the customer prototype order: Overview, Entrance Assessments, Fees, Exam Results, Contacts, Events, Notes & Info, Documents, and a "More" menu (Courses, Bank details, Visits). URL keys unchanged; `?tab=supplementary` opens Notes & Info. Only the open tab loads (was about 33 queries per view; `page.tsx` 783 to 62 lines). Overview rebuilt as School details and Admissions cards (Quick Actions, Contact, Address and Visa cards removed). Write controls hidden without Schools WRITE; entrance assessment edit stays open to exam-paper rights. Suite: 947 tests. Results summary and fee years followed in phase 4 (2026-10-21).
- **2026-10-21** — School page, phase 4 (customer item 8, part 2; completes plan `261012-2115-application-detail-page-and-school-profile-layout`): Exam Results tab opens on a Summary (a table per exam type, a line per exam year newest first, grade bands as columns, Latest 3 / Last 5 / All years buttons; "All records (N)" keeps the editable list; IB points shown without "%"). Fees tab opens on the school's newest financial year with a year select ("All years (N)", "No year recorded"), fixed order within a year. No schema or query change. Suite: 982 tests. **Plan complete pending** manual browser checks of phases 1-4 and customer confirmation of the status-to-journey mapping.
- **2026-10-12** — School placement history (customer item 9):
  - New "Placement history" card at the end of a school's Overview tab (was Basic Info): one row per academic year
    (newest first, "2026–27" style; applications with no entry year in a last row "No entry year") with
    Applications, Offers, Students placed and Placement rate, plus an "All years" total whose rate comes
    from the summed counts. If the lookup fails the card says the history is unavailable.
  - Counted in the database by the read-only function `public.school_placement_history(p_school_id)`
    (migration `20261012130805`; `security invoker`, signed-in users only, counts only), because one school
    can have 10,000+ applications and the API returns at most 1,000 rows per request.
  - Working definitions, taken from the live data and stated on the card. **Not yet confirmed by the
    customer**; changing them means changing the status-code lists in that function. Offer = Offered or
    Deposited status, "Joined School but Left After", "Declined", or any application with a deposit record.
    Placed = Deposited status or "Joined School but Left After". Not counted: "General Enquiry",
    "Check Place", "Test Only (Refer)". "Completed" and "Confirmed" are neither. Rate = placed / applications.
    Academic year starts in September. Figures use each application's current status (no status history).
  - "Expected commission" from the prototype is **not built**: the system has no commission terms.
  - Types note: the type generator proposed `PostgrestVersion` "13.0.5" in `src/types/database.ts`; the line
    was deliberately left at "14.5" and only the function signature was taken. Keep it so when regenerating.
  - Status: 60 test files / 845 tests, type-check, lint on touched files and permission coverage pass; code
    review 8.5/10 approved; function checked against live data (largest school: 10,590 applications, 2,327
    offers, 800 placed). **Not yet checked in a browser.**
- **2026-10-12** — School contacts, active only (customer item 10):
  - The Contacts tab of a school lists active contacts by default; a "Show inactive (N)" switch reveals
    the others, dimmed and badged. Nothing is deleted. Header and tab badge count active contacts.
  - One-click "Mark inactive" / "Reactivate" on each row (reuses `updateSchoolContact`, which now also
    requires the contact to belong to the given school).
  - The event form's representative dropdown (`getContactsForSchools`) offers active contacts only.
  - Add / Edit / Delete and the new button are hidden from users without Schools write access.
  - Pure rule in `src/lib/schools/contact-visibility.ts`. No schema change (`is_active` existed).
  - 58 test files / 825 tests pass. Not yet checked in a browser. All 3,351 contacts are active today,
    so the list is unchanged until staff mark contacts inactive.
- **2026-10-12** — Exam desk, phase 4 of 4 (cover slip PDF):
  - New "Cover slip" button on each exam desk row with a candidate (Exams read access). Opens a PDF in
    a new tab, one A4 page per candidate in seat order, to place on the seat. Shows name and code, seat
    box, school, date, start/end time (Hong Kong), room or "Online", invigilator (staff with role
    "officer", else the organiser, else a line to write on), assessment and papers with durations.
  - Route `GET /api/exams/cover-slip/pdf?booking=<uuid>` (401/403/400/404 refusals as readable HTML,
    `private, no-store`); own `outputFileTracingIncludes` entry in `next.config.ts`. New shared helper
    `src/lib/pdf/escape-html.ts`. Details: `docs/system-architecture.md` §7.1. Staff guide updated.
  - Status: 56 test files / 813 tests, type-check, lint and permission coverage pass; code review
    approved; real PDFs rendered locally and inspected. **Not yet checked** in the running app with a
    real booking, nor on a deployed preview. All four phases of the plan are now implemented.
  - Limits: layout is a first version, one adjustment round expected (customer template not shared).
    Chinese fonts on the server are unverified for all PDF exports (characters may show as empty
    boxes when deployed; see `docs/deployment-guide.md` §7.1). About 20 papers with very long titles
    can spill onto a second page. School comes from the booking only; a booking crossing midnight
    shows only the start date.
- **2026-10-12** — Exam desk, phase 1 of 4 (`/exams`):
  - New default view for the day of the exam: scheduler exam bookings for a From/To range (today in
    Hong Kong time, up to 62 days), filters for room, school, entry year, free-text search, click-to-sort
    headings, all in the URL. "Booked list" and "Showed up list"; a group exam is one row.
  - Row buttons: Confirm, Showed up, No show (Showed up stays available after No show). Showed up
    completes the linked exam request; no undo.
  - Previous list moved to `/exams?view=all` (old `?status=` links still work), with a new
    From/To filter on the scheduled date.
  - Filtering, sorting and splitting are pure tested helpers in `src/lib/exams/`; new reusable
    `SortableTableHead`; `/exams` now refreshes after any exam-type booking change. No schema change.
  - Status: unit tests, type-check and review pass; not yet checked in a browser with real exam
    bookings. Known gaps: group rows show no school/entry year; exam records without a scheduler
    booking appear only under All exams. Phases 2-4 (paper access, paper choice and print, cover slip) not started.
- **2026-10-12** — Exam desk, phase 3 of 4 (papers on the booking, availability, print):
  - School side: an entrance exam can be marked "Do not store – request from school" (new column
    `school_entrance_exams.paper_request_from_school`, migration `20261011234555_school_entrance_exam_paper_request_from_school.sql`);
    separate from `has_paper`. Nothing is uploaded, the list shows "On request"; earlier uploads stay stored but are not offered for printing.
  - Booking dialog (examination, group examination): "Papers" block filtered by entry year and year level,
    up to 20 papers, copied into `assessment_snapshot.papers`; Assessment label named after the subjects until typed over.
  - Exam desk: new Entry point and Paper availability columns (uploaded / online / request from school / not uploaded,
    read live; "Could not be checked" with an alert if the lookup fails); sort by most not-uploaded; "Print available" for the
    exam team with five-minute links.
  - Fix: an examination booking with the Assessment field empty could not be saved and showed no error; it now saves.
  - Tests: 53 files / 769 tests pass, type-check clean, permission coverage passes, code review approved.
    **Not yet checked in a browser.** Known limits: group exam with candidates from several schools offers only the first
    school's papers; booking end time not derived from total paper duration; `entrance-exam-dialog.tsx` is 397 lines (over the 200-line guideline).
    Phase 4 (cover slip PDF) waits for the customer's template.
- **2026-10-12** — Exam desk, phase 2 of 4, part A (exam paper files, exam team only):
  - A school's entrance exam paper files can only be listed, opened, attached, renamed or deleted
    with the Exams module at WRITE. Schools read still shows the exam format, not the papers.
    Download links sign only stored paths (papers expire after 5 minutes); deleting an exam or school
    that holds papers is exam-team only and refused when the paper count cannot be established.
  - Code: `exam-paper-access.ts`, `attachAccess(point)`, `record-attachment-signed-url.ts`. Tests: 47
    files / 710 tests pass; type-check and permission coverage clean. Not yet checked in a browser
    with two accounts.
  - **Limit:** application layer only. RLS policies are permissive and the storage bucket is readable
    by any signed-in user, so direct Supabase API use with the browser key could still read papers.
    Database policies (part B) postponed by the product owner. No paper files exist yet.
