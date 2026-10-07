# Codebase Summary

**Last updated:** 2026-10-02
**Stack:** Next.js 16 (App Router) + React 19 + TypeScript 5 + Supabase

---

## High-Level Numbers

| Metric | Value |
|---|---|
| Source files (src/) | ~290 files |
| Estimated LOC (src/) | ~40,500 |
| SQL migrations | 85 (numbered 001–078 + timestamped, incl. 6 scheduler migrations) |
| Server action files | 37 |
| Query files | 43+ |
| shadcn/ui primitives | 53 |
| Legacy migration scripts | 34 |
| Test files | 17 (305 tests) |

---

## Root Directory Layout

```
aa-new/
├── src/                  # Application source
├── supabase/
│   ├── migrations/       # 85 SQL migration files
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
    ├── pending-exam-bookings-card.tsx  # Dashboard alert: pending exam bookings count (spec NOT-01)
    ├── students/
    │   ├── page.tsx               # Student list with filters
    │   ├── students-filters.tsx
    │   ├── students-advanced-filters.tsx  # Sheet: sex, DOB, entry year, course, school, event, contact
    │   ├── student-form.tsx       # Shared create/edit form
    │   ├── new/page.tsx
    │   ├── brief-intros/export/   # Bulk Brief Introduction export — picker + controls + print CSS
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
    │       ├── student-calendar-section.tsx  # Scheduler tab: student's bookings/exams
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
    ├── exams/
    │   ├── page.tsx
    │   └── exam-management-table.tsx
    └── scheduler/                  # Rooms, bookings, exam scheduling (added 2026-09-28)
        ├── page.tsx                # My / team / rooms calendar (FullCalendar v7)
        ├── scheduler-shell.tsx     # Client shell: view state, dialogs orchestration
        ├── scheduler-toolbar.tsx
        ├── scheduler-filter-bar.tsx
        ├── people-picker.tsx
        ├── booking-details-sheet.tsx
        ├── move-confirm-dialog.tsx # Drag/resize reschedule confirmation
        ├── bookings/[id]/page.tsx  # Booking detail route (kept per Tab rule)
        └── rooms/                  # Rooms + locations admin
            ├── page.tsx
            ├── rooms-table.tsx
            ├── room-row.tsx
            ├── room-row-actions.tsx    # Per-row actions menu (edit/deactivate)
            ├── room-dialog.tsx
            ├── room-form-fields.tsx
            └── locations-panel.tsx / location-dialog.tsx

src/app/api/                       # Route Handlers — file downloads only
├── schools/export/pdf/            # Selected School List PDF
└── students/brief-intro/export/
    ├── pdf/                       # Brief Introduction booklet
    └── xlsx/                      # Brief Introduction data sheet
```

### components/ — Shared Components

```
src/components/
├── ui/                           # 53 shadcn/ui primitives
│   ├── button.tsx, input.tsx, select.tsx, dialog.tsx, ...
│   └── sonner.tsx                # Toast wrapper
├── features/                     # Cross-route feature components
│   ├── document-manager.tsx      # Owner-level Documents tab: batch upload, rename, download
│   ├── attachment-field.tsx      # Inline attach file/link next to a text field
│   ├── attachment-list.tsx       # Attachment rows: open (spinner while signing), delete
│   └── brief-intro-export-menu.tsx  # PDF/Excel menu — profile card + bulk picker
├── scheduler/                     # Scheduler UI (added 2026-09-28)
│   ├── scheduler-calendar.tsx     # FullCalendar wrapper — the one file that imports the library
│   ├── scheduler-calendar.css     # FullCalendar theme overrides
│   ├── booking-dialog.tsx         # Type-specific booking create/edit dialog
│   ├── booking-form-basics.tsx / booking-form-location.tsx / booking-form-people.tsx
│   ├── booking-form-staff-attendees.tsx / booking-form-candidates.tsx / booking-form-details.tsx
│   ├── booking-student-search.tsx
│   ├── booking-conflict-banner.tsx / use-booking-conflicts.ts
│   ├── booking-cancel-dialog.tsx  # Reason-required cancel
│   ├── booking-details.tsx        # Read view for booking detail route
│   ├── booking-details-ribbon.tsx # Type badge + status badge + room chip row atop details sheet
│   ├── booking-form-section.tsx   # Form section wrapper (When · Where · Who · Details eyebrows)
│   ├── booking-form-reason.tsx    # Cancel/reschedule reason field
│   ├── booking-status-badge.tsx   # Shared status pill (tokens only)
│   ├── room-chip.tsx              # Signature room tag + capacity meter — reused across scheduler
│   ├── booking-history-list.tsx   # Renders `scheduler_booking_history` rows
│   └── schedule-booking-button.tsx  # Entry point used by Exams page + student tab
├── permissions/                  # Permission-aware wrappers
└── layout/
    ├── sidebar.tsx               # App navigation sidebar
    ├── sidebar-navigation.ts     # Nav item config, incl. Scheduler entry
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
├── attachments/                  # Record attachments — file or link on a specific row
│   ├── attach-points.ts          # ATTACH_POINTS registry: owner, attachable_type, category
│   ├── constraints.ts            # ALLOWED_MIME, MAX_BYTES, isSafeExternalUrl, formatFileSize
│   ├── open-in-new-tab.ts        # Post-await open that Safari does not block
│   └── __tests__/                # 38 tests: registry/DB/seed parity, URL validation
├── rich-text.ts                  # sanitizeRichText() — cleans editor HTML before storage
├── pdf/
│   └── render-document-pdf.ts    # Shared headless-Chromium renderer (HTML string → PDF)
├── schools/                      # Selected School List export — types, shaping, HTML builder
├── brief-intro/                  # Brief Introduction export (PDF booklet + Excel sheet)
│   ├── export-types.ts           # One payload for single and bulk, PDF and Excel
│   ├── export-shaping.ts         # PURE: htmlToPlainText, toCellText/Date, filenames
│   ├── build-export-html.tsx     # server-only — booklet HTML for the PDF route
│   ├── build-export-workbook.ts  # server-only — exceljs flat data sheet
│   ├── download-export.ts        # Client helper shared by both entry points
│   └── __tests__/                # 49 tests: shaping + workbook round-trip
├── students/
│   └── parse-list-filters.ts     # URL params → list filters, shared by list + export picker
├── scheduler/                    # Scheduler pure helpers (added 2026-09-28) — unit tested, no I/O
│   ├── config.ts                 # SCHEDULER_TIMEZONE, FULLCALENDAR_LICENSE_KEY, slot constants
│   ├── booking-schema.ts         # zod schemas per booking type (discriminated union)
│   ├── room-schema.ts            # zod schema for room/location forms
│   ├── conflicts.ts              # Overlap/capacity/seat conflict detection (client-side pre-check)
│   ├── error-messages.ts         # Maps SQLSTATE codes (SR001–SR006, 23P01) → user messages
│   ├── calendar-adapter.ts       # PURE: bookings/exams/event_schedules → FullCalendar events
│   ├── colors.ts                 # Booking type/status → calendar color mapping
│   ├── search-params.ts          # URL query param parsing for calendar filters
│   ├── time-utils.ts             # Temporal/date-fns helpers, HKT-aware
│   ├── booking-defaults.ts       # Default form values per booking type
│   ├── exam-booking-defaults.ts  # Default form values for exam-linked bookings
│   ├── action-helpers.ts         # Shared RPC-call/error-mapping helpers for actions
│   └── __tests__/                # 7 test files: booking-schema, calendar-adapter, colors,
│                                  # conflicts, error-messages, exam-booking-defaults, search-params
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
    │   ├── school-visits.ts
    │   ├── scheduler-rooms.ts         # Room CRUD, requires EXAMS WRITE
    │   ├── scheduler-locations.ts     # Location CRUD, requires EXAMS WRITE
    │   ├── scheduler-bookings.ts      # Wraps scheduler_save_booking/confirm/cancel/record_attendance RPCs
    │   ├── scheduler-exams.ts         # Exam scheduling via the same RPCs (single write path)
    │   └── scheduler-availability.ts  # Wraps scheduler_free_busy / scheduler_available_rooms
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
        ├── school-visits.ts
        ├── scheduler-rooms.ts       # Room list for filters/booking dialog
        ├── scheduler-bookings.ts    # Calendar data via scheduler_calendar_items view
        ├── scheduler-exams.ts       # Exam bookings for Exams page + student tab
        ├── scheduler-history.ts     # scheduler_booking_history reads
        └── scheduler-stats.ts       # Rooms-view / dashboard counts
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

Migrations are in `supabase/migrations/` — numbered `001`–`078`, then timestamped (84 total).

| Range | Theme |
|---|---|
| 001–020 | Create reference/lookup tables + core entity tables (profiles, schools, students, events, applications, education, visa, travel, exam results) |
| 021–035 | Create school sub-entity tables (courses, fees, entrance exams, academic results, bank details, contacts, supplementary info, notes, visits), student log book, brief intro, resume, visits, officers, predeparture, enquiries |
| 036–051 | Data normalization: consolidate gender types, institution types, phases, religious affiliations, split/merge fields, remap categories, add scholarship types |
| 052–060 | Lead source restructure, visit fields on applications, new event types, consolidate event types, add application_id to individual exams, create internal notes, school intro approval, resume fields and documents |
| 061–068 | Resume profile/talents tables, event application status updates, year group on applications, nullable school_id on representatives, custom_access_token_hook (RBAC), schedule blocker, school_contact_id on representatives, is_active on school contacts |
| 069–078 | Student intro images bucket, document categories, school documents + bucket, row level security across the public schema, school export fields, county normalisation, current course fee |
| Timestamped (pre-scheduler) | School document category rounds, permission matrix, record attachments (polymorphic `attachable_type`/`attachable_id` + `external_url` on both document tables) |
| Timestamped (scheduler, 2026-09-28 to 2026-10-02) | `20260928070928_scheduler_core.sql` (locations, rooms, bookings, attendees, history, view, triggers), `20260928070931_scheduler_permission_module.sql` (module seed), `20260928071455_scheduler_free_busy_rpc.sql`, `20260928072540_scheduler_room_fk_on_exams.sql` (`room_id` FK on exam records), `20260928074722_scheduler_review_hardening.sql` (red-team fixes), `20261002165441_scheduler_grants_attendance_and_view_fix.sql` (EXECUTE grants, attendance RPC, exam-link-clear trigger, calendar view fix) |

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
| `@fullcalendar/react` 7.1.0 | Scheduler module calendar (Premium, resource views via `@fullcalendar/react-scheduler`) |
| `@dnd-kit/core` ^6.3 | Drag-and-drop for event scheduler |
| `recharts` ^2.15 | Charts |
| `sonner` ^2.0 | Toast notifications |
| `papaparse` ^5.5 | CSV parsing in migration scripts |
| `puppeteer-core` ^25.8 + `@sparticuz/chromium` ^149 | Headless Chromium for the PDF exports |
| `exceljs` ^4.4 | Excel workbook generation (pure JS, no native binary) |
| `sanitize-html` ^2.17 | Cleans editor HTML on save; flattens it for spreadsheet cells |
| `lucide-react` ^0.561 | Icon set |
| `date-fns` ^4.1 | Date utilities |
| `tsx` ^4.21 | Run TypeScript migration scripts directly |
