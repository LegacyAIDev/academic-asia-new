# Codebase Summary

**Last updated:** 2026-10-23
**Stack:** Next.js 16 (App Router) + React 19 + TypeScript 5 + Supabase

---

## High-Level Numbers

| Metric | Value |
|---|---|
| Source files (src/) | ~290 files |
| Estimated LOC (src/) | ~40,500 |
| SQL migrations | 89 (numbered 001–078 + timestamped, incl. 7 scheduler migrations) |
| Server action files | 37 |
| Query files | 43+ |
| shadcn/ui primitives | 53 |
| Legacy migration scripts | 34 |
| Test files | 36 (543 tests) |

---

## Root Directory Layout

```
aa-new/
├── src/                  # Application source
├── supabase/
│   ├── migrations/       # 89 SQL migration files
│   └── config.toml       # Supabase project config (project_id: aa-new)
├── scripts/              # 34 data migration TypeScript scripts (run via tsx)
├── data/                 # Source CSVs + migration output artifacts
├── requirements/         # Legacy spec documents (Word/PDF) + DB exports
├── docs/                 # Project docs; scheduler-user-guide.md is the staff-facing Scheduler guide
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
    │   ├── present-school-picker.tsx  # Current School picker (client): self-filtered Command, "Add to list", legacy-text hint
    │   ├── present-schools/       # "Current Schools" list management (/students/present-schools)
    │   │   ├── page.tsx           # Loads getPresentSchoolsWithCounts(); Students READ to view, WRITE to add/edit
    │   │   ├── present-schools-table.tsx  # Toolbar (search, source filter, count, Add); A–Z directory without a search, ranked matches (100 + Show more) with one
    │   │   ├── present-schools-directory.tsx # A–Z register: letter bar, sticky letter headings, every school (groupByInitial)
    │   │   ├── present-school-row.tsx     # Row: name, other spellings, "Added by staff", student count, Edit (memoised)
    │   │   └── present-school-dialog.tsx  # Add/edit dialog: name + other spellings; live "N students will show the new name" note
    │   ├── new/page.tsx
    │   ├── brief-intros/export/   # Bulk Brief Introduction export — picker + controls + print CSS
    │   └── [id]/
    │       ├── page.tsx           # Student detail — assembles all sections
    │       ├── edit/page.tsx
    │       ├── student-family.tsx         # Family tab: parent cards, the family line, suggestions, other family (groupFamily); Add/Edit/Delete need WRITE
    │       ├── family-parent-card.tsx     # Parent/guardian card: relationship · Main contact, name, occupation, call/email links
    │       ├── family-sibling-line.tsx    # Brothers and sisters + this student as dots on one line, eldest first ("Elder brother"); vertical on a phone
    │       ├── family-others-list.tsx     # Uncles, aunts, cousins, friends: one quiet row each
    │       ├── family-contact-bits.tsx    # contactName, memberDisplay, ContactLinks (tel:/mailto:), MemberActions (edit/delete)
    │       ├── family-suggestions.tsx     # "Possibly family in the system" card (WRITE only); one-click link, "Not family" hides for the visit
    │       ├── family-student-picker.tsx  # "Already a student?" picker in contact-dialog.tsx; server search as staff type
    │       ├── contact-dialog.tsx         # Add/edit family member; hosts the picker, always sends related_student_id
    │       ├── student-education.tsx
    │       ├── student-applications.tsx   # Applications tab; school name / eye icon link to the detail page; Create/Edit/Delete need WRITE
    │       ├── applications/[applicationId]/  # Application detail page (journey, record, deposits, exams, bookings, timeline, status control)
    │       ├── student-event-applications.tsx
    │       ├── student-exam-results.tsx
    │       ├── student-resume.tsx
    │       ├── student-resume-profile.tsx
    │       ├── student-visas.tsx
    │       ├── student-travel.tsx
    │       ├── student-brief-intro.tsx
    │       ├── student-internal-notes.tsx  # Read-only for users without Students WRITE; the old dialog is gone
    │       ├── student-legacy-log.tsx      # Old-system log book: collapsed, read-only, loads on click
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
    │       ├── page.tsx                    # 62 lines: school, write permission, 4 counts, Suspense per tab
    │       ├── school-header.tsx           # Name, badges, edit/delete (WRITE only)
    │       ├── school-tab-nav.tsx          # Plain-link tab bar + "More" menu (tabs from lib/schools/school-tabs.ts)
    │       ├── school-tab-content.tsx      # Async loader per main tab (only the open tab loads)
    │       ├── school-tab-content-more.tsx # Loaders for Courses, Bank details, Visits
    │       ├── school-tab-skeleton.tsx     # Suspense fallback
    │       ├── school-overview.tsx         # School details + Admissions cards, remarks, keywords
    │       ├── school-placement-history.tsx  # Overview card: applications/offers/placed/rate per academic year
    │       ├── school-supplementary-info.tsx # Notes & Info tab, 25 per page (?supPage=N)
    │       ├── school-documents.tsx, school-events.tsx
    │       ├── school-contacts.tsx
    │       ├── contact-active-toggle.tsx   # one-click mark inactive / reactivate
    │       ├── school-courses.tsx
    │       ├── school-fees.tsx               # Opens on newest financial year; year select (lib/schools/fee-years.ts)
    │       ├── school-entrance-exams.tsx
    │       ├── school-academic-results.tsx   # Summary first, "All records (N)" list with edit/delete
    │       ├── academic-results-summary.tsx  # Year blocks (figure tiles per exam type), range buttons, Copy summary
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
    │   ├── page.tsx                # Picks desk vs all view (?view=), loads data, checks Exams access
    │   ├── exam-desk-view.tsx      # Exam desk: date range, filters, Booked / Showed up lists
    │   ├── exam-desk-filters.tsx   # Room, school, entry year, search
    │   ├── exam-desk-table.tsx     # Sortable table (SortableTableHead)
    │   ├── exam-desk-row-actions.tsx  # Confirm / Showed up / No show / Open booking / Print available / Cover slip (opens PDF in a new tab)
    │   ├── exam-desk-print-papers.tsx # "Print available" dialog: one Open link per paper file, papers to request from the school
    │   ├── exam-date-range-filter.tsx # From/To inputs, shared by both views
    │   ├── exam-list-view.tsx      # "All exams" view (status tabs, paging)
    │   ├── use-exams-url.ts        # Client URL updates for exam page params
    │   └── exam-management-table.tsx  # Full exam list table (score entry, Schedule/Reschedule)
    └── scheduler/                  # Rooms, bookings, exam scheduling (added 2026-09-28)
        ├── page.tsx                # My / team / rooms calendar (FullCalendar v7)
        ├── scheduler-shell.tsx     # Client shell: view state, dialogs orchestration
        ├── scheduler-toolbar.tsx   # Command bar; "View only" badge + disabled New booking without WRITE
        ├── scheduler-date-picker.tsx  # Date label that opens a month picker
        ├── scheduler-filter-bar.tsx
        ├── people-picker.tsx
        ├── use-calendar-model.ts   # URL params + rows → FullCalendar view type, events, resources (person/room columns)
        ├── use-booking-actions.ts  # Confirm/attendance actions shared by details panel + right-click menu
        ├── calendar-context-menu.tsx  # Right-click menu on bookings and empty slots
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
├── exams/cover-slip/pdf/          # Exam cover slip PDF (one page per candidate; route.ts + __tests__/route.test.ts)
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
│   ├── sonner.tsx                # Toast wrapper
│   └── sortable-table-head.tsx   # Link-based sortable column heading (URL sort/dir)
├── features/                     # Cross-route feature components
│   ├── document-manager.tsx      # Owner-level Documents tab: batch upload, rename, download
│   ├── attachment-field.tsx      # Inline attach file/link next to a text field
│   ├── attachment-list.tsx       # Attachment rows: open (spinner while signing), delete
│   ├── record-notes.tsx          # Notes list for a student, application or exam (eyebrow, count, composer)
│   ├── record-note-item.tsx      # One note: byline, Edited marker, author-only Edit / Delete
│   ├── record-note-composer.tsx  # Text box + "Add note" (Ctrl/Cmd+Enter)
│   ├── record-notes-dialog.tsx   # "Notes" button opening the list in a dialog; loads on open
│   └── brief-intro-export-menu.tsx  # PDF/Excel menu — profile card + bulk picker
├── scheduler/                     # Scheduler UI (added 2026-09-28)
│   ├── scheduler-calendar.tsx     # FullCalendar wrapper — the one file that imports the library
│   ├── scheduler-calendar.css     # FullCalendar theme overrides
│   ├── booking-dialog.tsx         # Type-specific booking create/edit dialog
│   ├── booking-form-basics.tsx / booking-form-location.tsx / booking-form-people.tsx
│   ├── booking-form-staff-attendees.tsx / booking-form-candidates.tsx / booking-form-details.tsx
│   ├── booking-form-papers.tsx    # "Papers" block for exam bookings: choose a school's entrance exam papers
│   ├── booking-student-search.tsx
│   ├── booking-conflict-banner.tsx / use-booking-conflicts.ts
│   ├── booking-cancel-dialog.tsx  # Reason-required cancel
│   ├── booking-details.tsx        # Read view for booking detail route
│   ├── booking-copy-buttons.tsx   # "Copy details" / "Copy for family" buttons
│   ├── copy-booking.ts            # Clipboard copy of booking text (ClipboardItem promise fallback)
│   ├── booking-details-ribbon.tsx # Type badge + status badge + room chip row atop details sheet
│   ├── booking-form-section.tsx   # Form section wrapper (When · Where · Who · Details eyebrows)
│   ├── booking-form-reason.tsx    # Cancel/reschedule reason field
│   ├── booking-status-badge.tsx   # Shared status pill (tokens only)
│   ├── room-chip.tsx              # Signature room tag + capacity meter — reused across scheduler
│   ├── blocked-times-sheet.tsx    # Toolbar "Blocked times" sheet: own blocks list, add/edit/delete, "Ended" last
│   ├── blocked-time-form.tsx      # Label, repeat preset, days, times, dates
│   ├── blocked-time-clash-list.tsx  # Bookings a saved room block overlaps (next 62 days)
│   ├── blocked-time-date-field.tsx  # Date input for the block range
│   ├── booking-history-list.tsx   # Renders `scheduler_booking_history` rows
│   └── schedule-booking-button.tsx  # Entry point used by Exams page + student tab
├── permissions/                  # Permission-aware wrappers
└── layout/
    ├── sidebar.tsx               # App navigation sidebar
    ├── sidebar-navigation.ts     # Nav item config, incl. Scheduler entry; activeChildHref() highlights only the most specific child (Students vs Students → Current Schools); test in __tests__/sidebar-navigation.test.ts
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
├── students/
│   ├── phone-link.ts             # telHref: tel: link only for one callable number (pure; tested)
│   ├── linked-student-label.ts   # linkedStudentName, linkedStudentDetails, sharedDetailsText (suggestion "matched on" text) (picker, Family tab cards and suggestions; tested in __tests__/linked-student-label.test.ts)
│   ├── family-relationships.ts   # familyGroup (parents, siblings, others), groupFamily (Family tab groups; skips a link when the student links back), relationshipSeenFrom (link read from the other student's side), siblingCodeFor, siblingAgeLabel ("Elder brother"), eldestFirst, contactPriorityLabel ("Main contact") (pure; tested in __tests__/family-relationships.test.ts)
│   ├── student-search.ts         # studentSearchWords, studentSearchFilter (every word matches surname, first name, Chinese name or code)
│   └── present-school-name.ts    # cleanSchoolName, presentSchoolKey, parseSchoolListLine, schoolSearchKeys, PresentSchoolOption, indexPresentSchools, filterPresentSchools, PRESENT_SCHOOL_NAME_MAX, isUsableSchoolName, cleanOtherSpellings, PresentSchoolSource (pure; generic filter returns `total`; tested in __tests__/present-school-name.test.ts)
├── attachments/                  # Record attachments — file or link on a specific row
│   ├── attach-points.ts          # ATTACH_POINTS registry: owner, attachable_type, category; attachAccess(point)
│   ├── exam-paper-access.ts      # EXAM_PAPER_ACCESS (Exams WRITE), paper category code, isExamPaperRow
│   ├── constraints.ts            # ALLOWED_MIME, MAX_BYTES, isSafeExternalUrl, formatFileSize
│   ├── open-in-new-tab.ts        # Post-await open that Safari does not block
│   └── __tests__/                # registry/DB/seed parity, URL validation, exam-paper-access
├── rich-text.ts                  # sanitizeRichText() — cleans editor HTML before storage
├── pdf/
│   ├── render-document-pdf.ts    # Shared headless-Chromium renderer (HTML string → PDF)
│   └── escape-html.ts            # escapeHtml: shared by the renderer footer and the cover slip
├── schools/                      # Selected School List export — types, shaping, HTML builder
│   ├── school-tabs.ts            # PURE: school page tab keys, labels, order, "More" group, ?tab= resolution (supplementary → notes, unknown → basic)
│   ├── placement-history.ts      # PURE: academicYearLabel, placementRate, toPlacementRows (rows + "All years" total)
│   ├── academic-results-summary.ts # PURE: summariseResultsByYear (year blocks, aligned band columns per grading scale, bar shares, range filter), resultsSummaryText, bandLabel, IB average points
│   ├── fee-years.ts              # PURE: financial-year list/default, fee ordering (reuses year-levels.ts)
│   └── __tests__/                # placement-history, school-tabs, academic-results-summary, fee-years
├── brief-intro/                  # Brief Introduction export (PDF booklet + Excel sheet)
│   ├── export-types.ts           # One payload for single and bulk, PDF and Excel
│   ├── export-shaping.ts         # PURE: htmlToPlainText, toCellText/Date, filenames
│   ├── build-export-html.tsx     # server-only — booklet HTML for the PDF route
│   ├── build-export-workbook.ts  # server-only — exceljs flat data sheet
│   ├── download-export.ts        # Client helper shared by both entry points
│   └── __tests__/                # 49 tests: shaping + workbook round-trip
├── students/
│   └── parse-list-filters.ts     # URL params → list filters, shared by list + export picker
├── applications/                 # Application detail helpers (2026-10-20) — unit tested, no I/O
│   ├── application-journey.ts    # journeyFor, stageLabel, groupStatusesByStage: status code → six steps / Placed / Closed (working mapping)
│   ├── application-display.ts    # Shared status colours, month-year, UTC date, time, money, age
│   ├── application-timeline.ts   # buildApplicationTimeline: newest-first events
│   └── __tests__/                # journey, timeline
├── exams/                        # Exam desk pure helpers (2026-10-12) — unit tested, no I/O
│   ├── exam-page-search-params.ts  # URL params for /exams: view, desk (from/to/room/school/year/q/sort/dir), list; hrefs, nextSort
│   ├── exam-desk-rows.ts         # Bookings → desk rows (group = one row), split Booked/Showed up, row action rules
│   ├── exam-desk-filter-sort.ts  # Filter options from rows, filtering, search, sorting
│   ├── exam-paper-selection.ts   # Booking dialog helpers: toSnapshotPaper, year levels, total minutes, entry-year/year-level filters
│   ├── exam-paper-availability.ts  # summarisePaperAvailability: uploaded / online / request from school / not uploaded; UNCHECKED_AVAILABILITY
│   ├── cover-slip-shaping.ts     # PURE: buildCoverSlips (one slip per candidate, seat order, invigilator rule), coverSlipFilename
│   ├── cover-slip-html.ts        # coverSlipHtml: A4 page per slip as escaped strings; needsCompactLayout (one-sheet rule)
│   └── __tests__/                # 9 files: params, rows, filter-sort, edge cases, fixture, exam-desk-papers, exam-papers, cover-slip, cover-slip-one-sheet
├── scheduler/                    # Scheduler pure helpers (added 2026-09-28) — unit tested, no I/O
│   ├── config.ts                 # SCHEDULER_TIMEZONE, FULLCALENDAR_LICENSE_KEY, slot constants
│   ├── booking-schema.ts         # zod schemas per booking type (discriminated union)
│   ├── assessment-snapshot.ts    # assessment_snapshot schema (label, version, notes, papers), label-from-papers rule, snapshotPapers, normaliseAssessmentSnapshot
│   ├── room-schema.ts            # zod schema for room/location forms
│   ├── conflicts.ts              # Overlap/capacity/seat conflict detection (client-side pre-check)
│   ├── error-messages.ts         # Maps SQLSTATE codes (SR001–SR006, 23P01; SR005 = room blocked) → user messages
│   ├── calendar-adapter.ts       # PURE: bookings/exams/event_schedules → FullCalendar events
│   ├── colors.ts                 # Booking type/status → calendar color mapping
│   ├── search-params.ts          # URL query param parsing for calendar filters; usesPersonColumns, fullCalendarViewType
│   ├── time-utils.ts             # Temporal/date-fns helpers, HKT-aware; normaliseSelection (slot → booking length)
│   ├── cancelled-items.ts        # Cancelled booking row → calendar view-row shape (Cancelled filter)
│   ├── people-filter.ts          # peopleOrFilter: shared PostgREST `or` for active + cancelled queries
│   ├── return-path.ts            # safeReturnPath (open-redirect safe `?from=`: scheduler, exams, student), returnLabel, bookingPageHref
│   ├── blocked-times.ts          # Blocked time presets, zod schema, describeBlockedTime, findBlockClashes, hkDateRangeToInstants, hasEnded
│   ├── booking-permissions.ts    # canCancelBooking: single UI cancel rule, mirrors server check
│   ├── person-name.ts            # personName: display name from first_name/surname
│   ├── uuid.ts                   # isUuid: shared id check (search-params, people-filter)
│   ├── selection-prefill.ts      # Picked slot + column → booking dialog defaults; slotFromGridAttributes
│   ├── booking-text-formatters.ts  # Copy text: booking details (CAL-09), family exam text (CAL-10)
│   ├── booking-defaults.ts       # Default form values per booking type
│   ├── exam-booking-defaults.ts  # Default form values for exam-linked bookings
│   ├── booking-revalidation-paths.ts  # bookingRevalidationPaths: pages to refresh after a booking changes (/exams for exam types)
│   ├── action-helpers.ts         # Shared RPC-call/error-mapping helpers for actions
│   └── __tests__/                # 24+ test files incl. assessment-snapshot (papers, label rule, empty Assessment saves): booking-permissions, person-name, uuid, booking-schema, booking-defaults, booking-text-formatters,
│                                  # family-exam-text, calendar-adapter (+ person-columns), cancelled-items, colors,
│                                  # conflicts, error-messages, exam-booking-defaults, people-filter, return-path,
│                                  # search-params (+ team-and-href), selection-prefill, time-utils;
│                                  # fixtures: booking-detail-fixture, calendar-item-fixture
└── supabase/
    ├── client.ts                 # Browser Supabase client (anon/publishable key)
    ├── server.ts                 # Server component client (cookie SSR)
    ├── admin.ts                  # Service-role client — server-only
    ├── middleware.ts             # updateSession() — refreshes session cookies per request
    ├── auth.ts                   # getCurrentUser() → { id, email, first_name, surname, department_label, admin_level }
    ├── actions/                  # 'use server' mutation files — one per domain
    │   ├── students.ts           # createStudent, updateStudent, deleteStudent; ActionResult<T> defined here; withListSchoolName copies the list school name; contact create/update use withLinkedStudent (family link, copies the linked student's name)
    │   ├── student-family.ts     # searchStudentsForFamilyAction (Students READ); test in __tests__/student-contact-link.test.ts
    │   ├── present-schools.ts    # addPresentSchool (picker, Students WRITE): existing school by search-key overlap or new staff row; createPresentSchool / updatePresentSchool (Current Schools page; rename replaces the old name and updates linked students' present_school); tests in __tests__/present-schools.test.ts, present-schools-manage.test.ts, student-present-school.test.ts
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
    │   ├── record-notes.ts            # Add / edit / delete a note; edit and delete are author-only
    │   ├── student-documents.ts
    │   ├── student-resume.ts
    │   ├── student-resume-profile.ts
    │   ├── student-resume-talents.ts
    │   ├── student-resume-aa-tests.ts
    │   ├── school-contacts.ts
    │   ├── school-courses.ts
    │   ├── school-fees.ts
    │   ├── school-entrance-exams.ts   # includes paper_request_from_school
    │   ├── exam-papers.ts             # getSchoolExamPaperOptionsAction (Scheduler READ, format only); getBookingPaperFilesAction (exam team, takes booking id)
    │   ├── record-attachment-signed-url.ts  # getAttachmentSignedUrl: signs stored paths only, 5 min for exam papers
    │   ├── __tests__/                 # exam-paper-file-access, exam-paper-write-access (exam-team-only papers), exam-papers-actions, exam-papers-print-failures
    │   ├── school-academic-results.ts
    │   ├── school-bank-details.ts
    │   ├── school-notes.ts
    │   ├── school-visits.ts
    │   ├── scheduler-rooms.ts         # Room CRUD, requires EXAMS WRITE
    │   ├── scheduler-locations.ts     # Location CRUD, requires EXAMS WRITE
    │   ├── scheduler-bookings.ts      # Wraps scheduler_save_booking/confirm/cancel/record_attendance RPCs
    │   ├── scheduler-exams.ts         # Exam scheduling via the same RPCs (single write path)
    │   ├── scheduler-blocked-times.ts # create/update/delete blocked times; owner = signed-in user; room blocks need EXAMS WRITE; returns clashes
    │   └── scheduler-availability.ts  # Wraps scheduler_free_busy / scheduler_available_rooms
    └── queries/                  # Read-only data fetching for Server Components
        ├── exam-papers.ts            # getSchoolExamPaperOptions; getExamPaperStatuses (live counts per paper, null on failure)
        ├── scheduler-calendar-helpers.ts  # peopleOrFilter lookups, fetchCancelledRows, attachAttendees, inBatches (100-id batches)
        ├── __tests__/                # Scheduler query tests against a stubbed query builder (supabase-stub.ts); exam-paper-listing-access.test.ts covers papers hidden from non-team users
        ├── students.ts
        ├── student-family.ts         # searchStudentsForFamily (20 results, throws), getFamilyLinksToStudent, getLinkedStudent, getFamilySuggestions (rpc `student_family_suggestions`, limit 5, [] on error); test in __tests__/student-family.test.ts. getStudentContacts (students.ts) embeds related_student via the named FK
        ├── present-schools.ts        # getPresentSchools (active, pages of 1,000, [] on error), getPresentSchoolsWithCounts (all, with source and students(count); throws), getPresentSchoolName (throws); test in __tests__/present-schools.test.ts
        ├── schools.ts
        ├── staff.ts
        ├── events.ts
        ├── event-scheduler.ts
        ├── event-reference-queries.ts
        ├── exam-management.ts
        ├── student-applications.ts   # incl. getStudentApplicationById(applicationId, studentId), getApplicationReferenceData (+ subStatuses)
        ├── application-bookings.ts   # getApplicationBookings: scheduler bookings of an application, [] without Scheduler READ
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
        ├── school-placement-history.ts  # getSchoolPlacementHistory: calls the school_placement_history RPC, null on failure
        ├── scheduler-rooms.ts       # Room list for filters/booking dialog
        ├── scheduler-bookings.ts    # Calendar data via scheduler_calendar_items view
        ├── scheduler-calendar-helpers.ts  # Attendee attach, people→booking ids (range-bounded), fetchCancelledRows
        ├── scheduler-exams.ts       # Exam bookings for Exams page + student tab
        ├── exam-desk.ts             # getExamDeskBookings: exam bookings in a date range (exam desk)
        ├── scheduler-blocked-times.ts  # listBlockedTimes, getBlockedTimeOccurrences (calendar shading), getRoomItemsInRange
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

Migrations are in `supabase/migrations/` — numbered `001`–`078`, then timestamped (89 total).

| Range | Theme |
|---|---|
| 001–020 | Create reference/lookup tables + core entity tables (profiles, schools, students, events, applications, education, visa, travel, exam results) |
| 021–035 | Create school sub-entity tables (courses, fees, entrance exams, academic results, bank details, contacts, supplementary info, notes, visits), student log book, brief intro, resume, visits, officers, predeparture, enquiries |
| 036–051 | Data normalization: consolidate gender types, institution types, phases, religious affiliations, split/merge fields, remap categories, add scholarship types |
| 052–060 | Lead source restructure, visit fields on applications, new event types, consolidate event types, add application_id to individual exams, create internal notes, school intro approval, resume fields and documents |
| 061–068 | Resume profile/talents tables, event application status updates, year group on applications, nullable school_id on representatives, custom_access_token_hook (RBAC), schedule blocker, school_contact_id on representatives, is_active on school contacts |
| 069–078 | Student intro images bucket, document categories, school documents + bucket, row level security across the public schema, school export fields, county normalisation, current course fee |
| Timestamped (pre-scheduler) | School document category rounds, permission matrix, record attachments (polymorphic `attachable_type`/`attachable_id` + `external_url` on both document tables) |
| Timestamped (scheduler, 2026-09-28 to 2026-10-02) | `20260928070928_scheduler_core.sql` (locations, rooms, bookings, attendees, history, view, triggers), `20260928070931_scheduler_permission_module.sql` (module seed), `20260928071455_scheduler_free_busy_rpc.sql`, `20260928072540_scheduler_room_fk_on_exams.sql` (`room_id` FK on exam records), `20260928074722_scheduler_review_hardening.sql` (red-team fixes), `20261002165441_scheduler_grants_attendance_and_view_fix.sql` (EXECUTE grants, attendance RPC, exam-link-clear trigger, calendar view fix), `20261023190212_scheduler_blocked_times.sql` (blocked times table, occurrence function, SR005) |
| Timestamped (2026-10-12) | `20261012130805_school_placement_history.sql` (read-only function `school_placement_history(p_school_id)`: per-entry-year application/offer/placed counts for a school) |
| Timestamped (2026-10-21) | `20261021204752_present_schools.sql` (table `present_schools`, `students.present_school_id` FK, select/insert/update RLS, no delete) |
| Timestamped (2026-10-22) | `20261022152919_student_contacts_related_student.sql` (`student_contacts.related_student_id` FK to `students`, no self-link check, partial index, unique per student and link) |
| Timestamped (2026-10-22) | `20261022165842_student_family_suggestions.sql` (function `student_family_suggestions(p_student_id)` plus two partial expression indexes on contact mobile digits and `lower(btrim(email_1))`; execute for `authenticated` only) |
| Timestamped (2026-10-23) | `20261023193522_record_notes_and_school_note_authors.sql` (table `record_notes` with author-only write RLS, `school_notes.created_by`) |
| Timestamped (2026-10-20) | `20261020110718_student_application_status_history.sql` (table `student_application_status_history`, trigger `student_applications_status_history`, select-only RLS), `20261020133120_student_application_status_history_revoke_execute.sql` (revokes EXECUTE on the trigger function) |

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
- `43_import-present-schools.ts` — loads the Hong Kong school list into `present_schools` and links students (not part of `remigrate.sh`; see deployment guide 5a)

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
