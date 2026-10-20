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

Hosted Supabase project (`aa-new`). 89 SQL migrations define the schema. Heavy use of reference/lookup tables for normalized categorical data.

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

**Placement history.** A school's Overview tab shows applications, offers, placed students and placement rate per academic year. The counts come from the read-only database function `public.school_placement_history(p_school_id uuid)` (migration `20261012130805`; `security invoker`, signed-in users only, returns counts only), not from the app: one school can have 10,000+ applications and the API returns at most 1,000 rows per request. `getSchoolPlacementHistory` (`src/lib/supabase/queries/school-placement-history.ts`) calls it and `src/lib/schools/placement-history.ts` shapes the rows. Offer and placed are working definitions derived from the live data (offer: Offered/Deposited status, "Joined School but Left After", "Declined", or a deposit record; placed: Deposited or "Joined School but Left After"; enquiry-type statuses not counted). They are not yet confirmed by the customer; changing them means editing the status-code lists in the function. Figures reflect current application status, as there is no status history.

### 5.6 Student Resume Tables

`student_resume`, `student_resume_profile`, `student_resume_talents`, `student_resume_aa_tests`, `student_legal_documents`

### 5.7 Documents and Record Attachments

`student_documents` and `school_documents` are the only two file stores in the app.
Each row is one artifact belonging to one owner (a student or a school), categorised
by `document_categories.code`. Files live in the private `student-documents` /
`school-documents` buckets and are read through short-lived signed URLs.

A row can be attached to a **specific record** rather than just to the owner:

| Column | Meaning |
|---|---|
| `attachable_type` | Parent table name, e.g. `student_visas`, `school_fees`. Null for owner-level documents. |
| `attachable_id` | Parent row uuid. |
| `external_url` | Set when the artifact is a link rather than an uploaded file. |

This backs the "file/link support where only text input exists" requirement:
certificate, exam paper, qualification and fee-schedule fields keep their text
value and gain the ability to carry the real document.

Three CHECK constraints hold the model together (migration
`20260827092739_record_attachments.sql`):

1. **artifact** — exactly one of `(file_path + file_name)` or `external_url`. A row
   can never point at nothing, or at two different things.
2. **pair** — `attachable_type` and `attachable_id` are both set or both null.
3. **type** — `attachable_type` is drawn from a per-side allowlist, so a school
   table name cannot land on `student_documents`.

**Why this extends the existing tables rather than adding an `attachments` table:**
one bucket, one upload path, one manager component — and record-level attachments
still appear in the Documents tab, so staff who look there first are not shown a
partial picture.

**The cost:** a polymorphic reference cannot have a foreign key, so nothing cascades.
Cleanup is explicit — every parent `delete*` action calls `deleteAttachmentsForRecord`
before removing its row, and `deleteStudent` / `deleteSchool` call `purgeOwnerStorage`
to sweep the bucket. Skipping either leaves orphaned storage objects that nothing
will ever find again.

**Code layout:**

```
lib/attachments/attach-points.ts   ← registry: owner, attachable_type, category, label; attachAccess(point)
lib/attachments/exam-paper-access.ts ← exam-team-only rule for entrance exam papers
lib/attachments/constraints.ts     ← ALLOWED_MIME, MAX_BYTES, isSafeExternalUrl
queries/record-attachments.ts      ← batched reads keyed by attachable_id
actions/record-attachments.ts      ← attach file/link, delete, purge
actions/record-attachment-signed-url.ts ← download link for an attachment (path from the database)
components/features/attachment-field.tsx  ← inline control; stages on create, flushes after insert
```

`ATTACH_POINTS` is the single source of truth. `attach-points.test.ts` asserts it
agrees with the CHECK lists and the category seeds — the three copies of that
knowledge will otherwise drift.

**Permissions:** attachments have no module of their own. By default they inherit the
parent entity's rights (Students or Schools). `attachAccess(point)` in `attach-points.ts`
returns the rights for any attach point; every action and query goes through it, never
through `ownerConfig(point).module` directly. One attach point deviates, see below.

**Exam papers are exam-team only.** A school's entrance exam paper files do not follow
the Schools rights. Listing, opening, attaching, renaming and deleting them needs the
Exams module at WRITE (`EXAM_PAPER_ACCESS`). Everyone with Schools read still sees the
exam format (subject, duration, instructions, "has paper"), just not the papers.

- **One definition:** `lib/attachments/exam-paper-access.ts` holds the rule, the paper
  category code and `isExamPaperRow` (paper category OR attached to an entrance exam).
  `attachAccess` returns it for `school_entrance_exam_paper`.
- **Reads:** `getAttachmentsForMany` checks the right itself and returns nothing without
  it, so no page can forget. `getSchoolDocuments` leaves papers out of the Documents tab
  for non-team users.
- **Download links:** `getAttachmentSignedUrl` (`actions/record-attachment-signed-url.ts`)
  and `getSchoolDocumentSignedUrl` sign only a path stored for a document, never the
  string sent by the browser. A path shared with a paper counts as a paper. Paper links
  last 5 minutes, others 60. A paper refused to a non-team user reads as "Document not found".
- **Writes:** attach file/link, delete one or all attachments of a record, Documents-tab
  upload into the paper category, rename and delete are refused without the right.
  `deleteAttachment` only acts on an attachment of the attach point it was called with.
- **Parent deletes:** an entrance exam with papers, and a whole school holding papers
  (`deleteSchool`), can only be deleted by the exam team. If the paper count cannot be
  established the delete is refused.
- **Fails closed:** "could not check" is treated as "may be a paper".
- **UI:** the entrance exam dialog shows the paper control only to the exam team; others
  see "Papers are kept by the examination team." An exam officer needs Schools write as
  well as Exams write to reach that dialog.

- **Request from school.** `school_entrance_exams.paper_request_from_school` (boolean, default false; migration `20261011234555_school_entrance_exam_paper_request_from_school.sql`) means the school asked us not to keep the paper and the exam team requests it per sitting. It is separate from `has_paper` (a physical copy held in the office). When true, nothing is uploaded, the exam list shows an "On request" badge, files uploaded earlier stay stored but are not offered for printing, and the exam desk counts the paper as "request from school".

> **LIMIT: application-layer protection only.** Row-level security is enabled but its
> policies are permissive, and the `school-documents` bucket is readable by any signed-in
> user. Someone calling the Supabase API directly with the browser key could still read
> paper files. Database-level policies (part B of exam desk phase 2) were postponed by
> decision of the product owner. No paper files exist yet. Not yet checked in a browser
> with two accounts.

---

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

State mutations go through `actions/event-scheduler.ts` Server Actions. Calendar rendering for this feature uses `@dnd-kit/core` directly (not FullCalendar) — see §6a for the shared calendar library used by the newer Scheduler module.

---

## 6a. Scheduler Module (Rooms, Bookings, Exam Scheduling)

Internal scheduler for staff, room, and examination bookings (`src/app/(dashboard)/scheduler/`), added 2026-09-28. Calendar rendering is FullCalendar v7 Premium, not `@schedule-x` (evaluated then removed during the build).

**Calendar library:** `@fullcalendar/react` 7.1.0 core + `@fullcalendar/react-scheduler` 7.1.0 for resource/room timeline views. Plugins are imported from their v7 subpaths, not the v6-style flat package. Timezones are Temporal-based; the business timezone `Asia/Hong_Kong` is fixed in `src/lib/scheduler/config.ts` (`SCHEDULER_TIMEZONE`) rather than read from the browser. A single wrapper component (`src/components/scheduler/scheduler-calendar.tsx`) imports the library; everything else maps data through a pure adapter (`src/lib/scheduler/calendar-adapter.ts`).

**License:** Premium runs under the evaluation key until purchased. `FULLCALENDAR_LICENSE_KEY` in `src/lib/scheduler/config.ts` reads `NEXT_PUBLIC_FULLCALENDAR_LICENSE_KEY`, falling back to the evaluation license string when unset. Purchasing before go-live is an open item (see roadmap).

**Data model:**

| Table / View | Purpose |
|---|---|
| `scheduler_locations` | Physical sites (e.g. "AA Centre") |
| `scheduler_rooms` | Rooms per location: capacity, facilities, active flag |
| `scheduler_bookings` | One row per booking. `type`: `examination`\|`group_examination`\|`consultation`\|`school_interview`\|`internal_meeting`\|`room_reservation`\|`other`. `status`: `pending`\|`confirmed`\|`cancelled`. `location_type`: `room`\|`online` |
| `scheduler_booking_attendees` | Staff/student attendees per booking: `role`, `seat_no`; denormalises `room_id` + period from the parent booking so seat clashes can be enforced with an `EXCLUDE` constraint |
| `scheduler_booking_history` | Append-only audit trail, written by a trigger on every insert/update (`created`/`confirmed`/`rescheduled`/`updated`/`cancelled`), actor = `auth.uid()`, reason captured in `changes` |
| `scheduler_calendar_items` (view) | Union of non-cancelled bookings, confirmed exams, and `event_schedules` — the read source for calendar rendering. Cancelled bookings are not in it; the Cancelled filter reads `scheduler_bookings` (see "Calendar behaviour" below) |

**RPCs (all writes go through these, no direct table writes from the app):**
- `scheduler_save_booking` — atomic create/update across booking + attendees
- `scheduler_confirm_booking` — sets `confirmed_by`/`confirmed_at`
- `scheduler_cancel_booking(id, reason)` — soft-cancel only, reason required, no hard delete
- `scheduler_available_rooms` — remaining-capacity search for the "needs a room" flow
- `scheduler_free_busy` — availability check used while booking
- `scheduler_record_attendance(p_id, p_attendance)` — `show_up`\|`no_show`, confirmed bookings only; `show_up` on a booking linked to an exam moves that exam to `status_id = 3` (completed)

All five original RPCs plus `scheduler_record_attendance` are `revoke`d from `public`/`anon` and `grant`ed only to `authenticated` (`20261002165441_scheduler_grants_attendance_and_view_fix.sql`) — PostgREST can no longer execute them unauthenticated.

**Triggers / integrity:** a `BEFORE` trigger locks the room row and enforces capacity and rule checks, raising typed `SQLSTATE`s the UI maps to messages (`src/lib/scheduler/error-messages.ts`): `SR001` exclusive-slot overlap, `SR002` over capacity, `SR003` seat out of range, `SR004` missing cancel/reschedule reason, `SR006` inactive room, `23P01` seat clash (Postgres exclusion violation). Exam-type bookings are forced to `pending` on insert regardless of caller input, and rooms with `is_active = false` refuse new bookings (`SR006`). A second `BEFORE INSERT OR UPDATE` trigger, `scheduler_bookings_clear_exam_link`, nulls `exam_id` whenever `booking_type` is changed away from `examination`/`group_examination`, so a repurposed booking can't keep pointing at a stale exam record.

**Calendar view fix:** `scheduler_calendar_items` now includes exams with `status_id in (2, 3)` (confirmed and completed) and reports both as `confirmed` — a completed exam no longer shows as pending on the calendar.

**Calendar behaviour (customer feedback round 1, 2026-10-09):**

- **FullCalendar v7 event fields.** v7 reads `color` and a space-separated `className`. The v6 names `backgroundColor` / `borderColor` / `classNames` are silently stored as custom data, so colours and state classes (`is-pending`, `is-cancelled`, `is-readonly`) never rendered. `toEventInputFields` (`calendar-adapter.ts`) is the single mapping point: `color` + `className: classNames.join(' ')`. Resources sort by their `order` field via `resourceOrder="order"` (v7 default is `id,title`).
- **Team view = one column per person (day/week).** `usesPersonColumns(params)` (`search-params.ts`) is true for `view=team` and `mode` day/week; the view type becomes `resourceTimeGridDay` / `resourceTimeGridWeek` (same as Rooms). Resource keys are `p:<profileId>` / `s:<studentId>`, matching the `people` URL param. Week sets `datesAboveResources` (day first, person under it); `eventResourceEditable` is false outside Rooms, so a drag changes time only, never moves a booking to another person. A booking shared by two selected people appears once per column. Month stays the colour-by-person overlay. All derived in `src/app/(dashboard)/scheduler/use-calendar-model.ts` (`events`, `resources`, `people`, `viewType`) via `toPersonResources`.
- **Cancelled filter.** `scheduler_calendar_items` holds active bookings only, so `status=cancelled` reads `scheduler_bookings` directly: `fetchCancelledRows` (`src/lib/supabase/queries/scheduler-calendar-helpers.ts`) joins room + location and maps rows through `cancelledBookingToCalendarRow` (`src/lib/scheduler/cancelled-items.ts`) into the view-row shape, so the same adapter renders them. The people filter is shared by both queries via `peopleOrFilter` (`people-filter.ts`: `student_id.in.(...)` OR `<id|booking_id>.in.(...)`; returns null when nothing can match, query skipped). `bookingIdsForPeople` (attendees + organiser lookup) is bounded by the visible date range and, when cancelled is wanted, includes cancelled organised bookings.
- **Query hardening.** `bookingIdsForPeople` and `attachAttendees` log lookup failures (`console.error`) instead of failing silently; attendee lookups skip cancelled bookings unless the Cancelled filter is active. Id lists go to PostgREST in batches of 100 (`inBatches` in `scheduler-calendar-helpers.ts`), also used by `getStudentsByIds` (`scheduler-people.ts`). Stubbed query-builder tests live in `src/lib/supabase/queries/__tests__/`.
- **Shared rules and helpers.** `canCancelBooking` (`src/lib/scheduler/booking-permissions.ts`) is the single UI cancel rule (context menu + edit dialog), mirroring the server check in `cancelBooking`. `isExamBooking` lives in `config.ts`; `personName` in `person-name.ts`; `isUuid` in `uuid.ts` (used by `search-params.ts` and `people-filter.ts`, which drops non-uuid ids itself).
- **URL params.** Ids are deduped; the Rooms view with `mode=month` falls back to week (Rooms has no month layout).
- **Details sheet.** `booking-details-sheet.tsx` keys loaded data to the selection: fresh load per opening, content kept while the sheet closes, never another booking's data.
- **Runtime check (2026-10-11).** A server-side render of FullCalendar 7.1.0 with the adapter output confirmed event `className`/`color`, HK time placement, grid `data-date`/`data-time`/`data-resource-id`, room order and person columns.
- **Return navigation.** The details sheet and the right-click menu link to the booking page with `?from=<scheduler URL>` (`bookingPageHref`; `schedulerHref(params)` builds the URL); "Back to calendar" restores view, mode, date and filters. `safeReturnPath` (`src/lib/scheduler/return-path.ts`) accepts three in-app targets: `/scheduler…`, `/exams…`, `/students/<uuid>…`; it rejects `//`, `\`, `://` and anything else, using the fallback (`/scheduler?date=<local_date>`), so the param cannot act as an open redirect. `returnLabel(path)` gives the back-link wording ("Back to calendar" / "Back to exams" / "Back to student"). The Exams page (`exam-management-table.tsx`) and the student calendar tab (`student-calendar-section.tsx`) pass a return path through `bookingPageHref`.
- **Slot selection.** `normaliseSelection` (`time-utils.ts`): all-day / month-day click becomes 09:00–10:00 (`DAY_START_TIME`, `DEFAULT_BOOKING_MINUTES`); a single 15-minute grid click (`SLOT_MINUTES`) is stretched to 60 min; longer drags pass through. `prefillFromSelection` (`selection-prefill.ts`) turns the slot into booking-dialog defaults using the column it came from: rooms-view column sets the room; team-view colleague column (`p:`) adds that colleague as attendee (skipped if it is the current user, already organiser); student column (`s:`) sets a consultation for that student.
- **Right-click menu** (`calendar-context-menu.tsx`, Radix `ContextMenu` wrapping the calendar). Bookings are tagged `data-booking-key=<event id>` in `eventDidMount` (`tagEventElement` in `scheduler-calendar.tsx`) and found with `closest('[data-booking-key]')`. Empty slots have no per-cell React handler, so the menu calls `document.elementsFromPoint` and reads FullCalendar v7 grid attributes `data-date` / `data-time` / `data-resource-id`; `slotFromGridAttributes` parses them (date-only cells start at 09:00; malformed input or an impossible date such as 2026-02-30 returns null and the menu falls back to a plain "New booking"). Disabled on coarse pointers (`(pointer: coarse)`), where long-press belongs to calendar select/drag. Menu actions run via `setTimeout(0)` after the menu closes to avoid the Radix focus/pointer lock leaving the page unclickable. Confirm/cancel/attendance logic is shared with the details panel through `use-booking-actions.ts`.
- **Copy as text.** `booking-text-formatters.ts` holds pure formatters: `formatBookingText` (CAL-09, details for email/WhatsApp) and `formatFamilyExamText` (CAL-10, exam bookings only, `isExamBooking`); dates DD/MM/YYYY, 24-hour Hong Kong time. `src/components/scheduler/copy-booking.ts`: `copyBookingText` (booking already loaded) and `copyBookingById` (menu; loads via `getBookingDetailsAction`). Clipboard writes must begin inside the user gesture, so `copyBookingById` passes a `ClipboardItem` holding a promise of the text, falling back to `writeText` after loading where `ClipboardItem` is unsupported. Buttons: `booking-copy-buttons.tsx`.
- **View-only users.** `scheduler-toolbar.tsx` shows a "View only" badge + disabled New booking with a tooltip instead of hiding the button; the empty-slot menu shows the same hint. Selection/edit is off (`editable=canWrite`).
- Staff-facing guide: `docs/scheduler-user-guide.md`.

**Exam desk (`/exams`, phases 1 and 3 of the exam desk plan, 2026-10-12).** `/exams` has two views chosen by `?view=`. Default `desk` is the day-of list for exam staff; `view=all` is the previous exam list (status tabs, paging, score entry, Schedule/Reschedule) with an optional `from`/`to` filter on the scheduled date, and old links such as `/exams?status=2` still open it (`resolveExamView`).
- **Data flow.** The page reads one date range from `scheduler_bookings` through `getExamDeskBookings({ from, to })` (`src/lib/supabase/queries/exam-desk.ts`): types `examination`/`group_examination`, not cancelled, capped at `EXAM_DESK_MAX_ROWS` (1000). Everything after that happens on the server, in pure functions in `src/lib/exams/`: `toExamDeskRows` (one row per booking; a group exam is one row listing its candidates), `deriveExamDeskOptions` (room/school/entry-year choices come from the rows in range), `reconcileExamDeskFilters` (drops filters whose choice is no longer in range), `filterExamDeskRows` (room, school, year, free text over student name/code, school, assessment, title), `sortExamDeskRows`, `splitExamDeskRows` ("Booked list" with a waiting count, "Showed up list" with a present count) and `examDeskActions` (which row buttons show). Phase 1 needed no schema change.
- **URL state.** `parseExamDeskParams` (`exam-page-search-params.ts`) reads `from`, `to`, `room`, `school`, `year`, `q`, `sort`, `dir`; default range is today in Hong Kong time, ranges over `MAX_RANGE_DAYS` (62) are clamped, invalid values fall back. `examsHref` rebuilds links; `nextSort` toggles direction; `SortableTableHead` (`src/components/ui/sortable-table-head.tsx`) is a reusable link-based sortable column heading. Client updates go through `use-exams-url.ts`.
- **Row actions.** "Confirm" on a pending booking; "Showed up" / "No show" on a confirmed one (Showed up stays after No show for late arrivals). They reuse `confirmBooking` and `recordAttendance` (`scheduler-bookings.ts`); `show_up` completes the linked exam request and has no undo. "Open booking" links to the booking page with `?from=/exams…`.
- **Permissions.** Page: `requireAccess(MODULES.EXAMS)`. Action buttons need Exams WRITE (`examDeskActions(row, canWrite)`; server actions re-check); "Open booking" needs scheduler access; student names link only with Students access.
- **Revalidation.** `bookingRevalidationPaths` (`src/lib/scheduler/booking-revalidation-paths.ts`) decides which pages refresh after a booking changes: `/scheduler`, the student page, and `/exams` for every exam-type booking (or any with an `exam_id`).
- **Columns (phase 3).** Time, Student, School, Entry point (year level(s) of the chosen papers, then "2027 entry"), Assessment format, Paper availability, Room / seat, Status, Actions. Row fields `papers`, `yearLevels` and `availability` are built in `toExamDeskRows`; free-text search also matches paper subjects.
- **Paper availability.** The papers on screen are looked up live on every load (`getExamPaperStatuses`, `queries/exam-papers.ts`), because files are uploaded after booking. `summarisePaperAvailability` (`exam-paper-availability.ts`) puts each chosen paper in exactly one group, in this order: request from school, uploaded (has a file), online (link only), not uploaded (also a paper since removed from the school). Label example: "2 uploaded · 1 request from school · 1 not uploaded"; no papers chosen shows "No papers chosen". Sorting the column puts bookings with the most not-uploaded papers first. **Failure:** if the lookup fails, `getExamPaperStatuses` returns null, every row reads "Could not be checked" (`UNCHECKED_AVAILABILITY`, cannot print) and the page shows a `role="alert"` message, so a failed read never looks like missing papers. Only counts reach the page; file names and paths stay with the exam team.
- **"Print available".** Row button (`exam-desk-print-papers.tsx`) shown only with Exams WRITE and when `availability.canPrint` (at least one file or link). It opens a dialog that calls `getBookingPaperFilesAction(bookingId)` on each opening. Guard: `assertAccess` with the exam-paper attach point (Exams WRITE), the booking id must be a uuid, and the papers are read from the booking's own `assessment_snapshot`, never from ids sent by the browser. Returns one signed link per file (5-minute expiry; reopen for fresh ones), external links that pass `isSafeExternalUrl`, the subjects of "request from school" papers, and the school id for a link to its entrance exams tab. If paper states cannot be read, nothing is listed.
- **Cover slip (phase 4).** Each row with a candidate has a "Cover slip" action for everyone who can see the desk (Exams read access); it opens the PDF in a new tab (§7.1).
- **Limits.** Group rows with candidates from different schools use the first school (booking dialog offers only that school's papers); the booking end time is not derived from the papers' total duration (the total is only shown); exam records that never got a scheduler booking appear only under All exams. Paper file protection is application layer only (see §5.7). Status: all four phases implemented and unit-tested (56 files / 813 tests), type-check clean; **not yet checked in a browser, nor on a deployed preview**.

**Papers on a booking (phase 3).** The booking dialog for `examination` and `group_examination` has a "Papers" block (`booking-form-papers.tsx`, helpers in `src/lib/exams/exam-paper-selection.ts`). It lists the entrance exams of the booking's school (`getSchoolExamPaperOptionsAction`, needs Scheduler READ, returns format only: subject, year level, entry year, duration, request-from-school flag), narrowed by entry year (newest preselected) and year level. Up to `MAX_SNAPSHOT_PAPERS` (20) can be chosen; chosen papers show as removable chips. Choosing an application sets `school_id`; changing the school clears the chosen papers. A failed load shows an error, not "no entrance exams".
- **Snapshot shape.** `scheduler_bookings.assessment_snapshot` (JSON, `assessmentSnapshotSchema` in `src/lib/scheduler/assessment-snapshot.ts`): `{ label, version, notes, papers: [{ id, subject, year_level, entry_year, duration_minutes }] }`. `id` is `school_entrance_exams.id`. Papers are copied in, so a booking survives later edits to the school's exam list; whether a file exists is deliberately not stored. `snapshotPapers` reads the free-form column defensively.
- **Label rule.** `normaliseAssessmentSnapshot` names an empty label after the papers' subjects (`snapshotLabelFromPapers`: "English, Mathematics and Reasoning", each subject once) and falls back to "Assessment" when there is nothing; an untouched block saves as null. `labelAfterPaperChange` keeps the label in step with the papers until someone types their own. Fix: an examination booking with the Assessment field empty used to fail validation silently; it now saves.

**Range & id validation:** availability actions (`checkAvailability`, `findAvailableRooms` in `scheduler-availability.ts`) cap `from`/`to` at `MAX_RANGE_DAYS = 62` days (`src/lib/scheduler/config.ts`) and reject wider ranges before querying. URL-sourced ids (`src/lib/scheduler/search-params.ts`) are filtered through a UUID regex before being used as PostgREST filters.

**Attendance action:** `recordAttendance(id, attendance)` in `src/lib/supabase/actions/scheduler-bookings.ts` requires `EXAMS WRITE` and wraps `scheduler_record_attendance`.

**Dashboard:** `src/app/(dashboard)/pending-exam-bookings-card.tsx` shows a count of examination/group-examination bookings still `pending` (spec NOT-01). `getPendingExamBookings()` (`src/lib/supabase/queries/scheduler-stats.ts`) returns `{ count, earliestDate }`; the card links to the Rooms week view on the earliest pending exam date with `status=pending` and the exam types filtered.

**Exam scheduling has a single write path.** The exam *request* still originates on the application form (`application-exam-form.tsx`, unchanged). Date, time, room, and seat are set only via the scheduler booking dialog — opened from both the Exams page and the student detail calendar tab, same component. `updateExamFields` (in `student-individual-exams.ts`) is narrowed to score/remarks only; Exams-page date/time/room cells are read-only.

**Permissions:** new module `scheduler` — admin levels 0/3/4/6 get `WRITE`, 7/8 get `READ` (see `src/lib/permissions/modules.ts`). Confirming a booking, cancelling a confirmed exam booking, and rooms/locations CRUD additionally require `EXAMS WRITE`; a plain scheduler `WRITE` covers creating/updating/moving one's own bookings.

**Migrations:** `20260928070928_scheduler_core.sql` (tables, triggers, view), `20260928070931_scheduler_permission_module.sql` (module seed), `20260928071455_scheduler_free_busy_rpc.sql`, `20260928072540_scheduler_room_fk_on_exams.sql`, `20260928074722_scheduler_review_hardening.sql` (force-pending exam status, inactive-room refusal), `20261002165441_scheduler_grants_attendance_and_view_fix.sql` (EXECUTE grants, attendance RPC, exam-link-clear trigger, calendar view fix).

### 6b. Application detail page (2026-10-20, customer item 7 phases 1-2)

`/students/{studentId}/applications/{applicationId}` (`src/app/(dashboard)/students/[id]/applications/[applicationId]/`) replaces the old application popup. Guard: `MODULES.STUDENTS` READ. `notFound()` when either id is not a uuid or the application does not belong to the student (`getStudentApplicationById(applicationId, studentId)` filters on both).

- **Sections.** Header (school and student links, entry, status plus sub-status badge, Suspended / Referral / Archived), six-step journey, full record (sub-status, course detail, scholarship amount), deposits, entrance exams, linked scheduler bookings, read-only attachments, student card (consultant = student's assigned profile), status control, timeline.
- **WRITE only.** "Edit application" (opens the existing edit dialog) and the status control. The Applications tab on the student page shows Create / Edit / Delete only with WRITE; school name and eye icon link to the page.
- **Bookings.** `getApplicationBookings` (`queries/application-bookings.ts`) returns `[]` without `MODULES.SCHEDULER` READ, so the section is hidden; rows link to `/scheduler/bookings/{id}`. The scheduler booking details "Application" link points here.
- **Journey is derived, not stored.** `src/lib/applications/application-journey.ts` maps the status code to one of six steps (Preparing, Submitted, Assessment / interview, Awaiting decision, Offer received, Family decision) or an outcome: Placed (5 deposited statuses plus `joined_school_left_after`, same rule as placement history) or Closed (rejected, withdrawn, drop, cannot_proceed, tnfa, no_show_interview, full, full_check_later, full_wl, declined). `completed` and `confirmed` have no step. `groupStatusesByStage` feeds the status control. **The mapping of all 50 statuses is a working assumption, customer confirmation pending**; changing it means editing that one file.
- **Timeline.** `buildApplicationTimeline` (`application-timeline.ts`): newest first, from registration, event, visit, exams (confirmed date else preferred), bookings, deposits and status changes. Status changes read "Status: A → B", "Status set to B" (first record), "Sub-status …", plus "by {name}"; dated in Hong Kong time. The page notes "Status changes are recorded from 20 Oct 2026; earlier ones were not kept."
- **Status history (phase 2).** Table `public.student_application_status_history` (migrations `20261020110718_student_application_status_history.sql`, `20261020133120_student_application_status_history_revoke_execute.sql`): `application_id` (FK, on delete cascade), `from_status_id` / `to_status_id`, `from_sub_status_id` / `to_sub_status_id`, `changed_by` (FK `profiles`, on delete set null), `changed_at`. Written **only** by trigger `student_applications_status_history` (AFTER INSERT OR UPDATE OF `status_id`, `sub_status_id` on `student_applications`) calling `log_student_application_status_change()` (security definer, `search_path ''`). Actor is the profile of `auth.uid()`, or null, so a missing profile never blocks a save. EXECUTE on the function is revoked from public, anon and authenticated. Re-saving an unchanged status writes nothing. RLS: select for `authenticated` only, no write policies, anon revoked. **No backfill**: history starts 2026-10-20. Read by `getApplicationStatusHistory` (`queries/application-status-history.ts`): newest first, id tie-break, limit 100.
- **Bulk loads.** Importing or re-importing `student_applications` fires the trigger and writes one history row per application dated at import time. Disable it for bulk loads (see `deployment-guide.md` §5).
- **Status change.** `updateStudentApplication` accepts `sub_status_id`, is scoped by `id` AND `student_id` ("Application not found" on no match), ignores a `student_id` in the input, and revalidates `/students/{id}` and the application page. Status and sub-status are saved together. `getApplicationReferenceData` now also returns `subStatuses`.
- **Shared display helpers.** `application-display.ts` (status colours, month-year label, UTC date formatting, time, money, age) replaces duplicates in the list and the removed popup.
- **Status.** Unit tested (suite 939 tests); not yet checked in a browser or on a preview.

### 6c. School page (2026-10-20, customer item 8 part 1)

`/schools/{id}` (`src/app/(dashboard)/schools/[id]/`). Tabs are defined in `src/lib/schools/school-tabs.ts` and rendered as plain links; `?tab=` keys are unchanged (`basic`, `entrance-exams`, `fees`, `academic-results`, `contacts`, `events`, `notes`, `documents`, `courses`, `bank-details`, `visits`).

- **Tab bar.** Overview, Entrance Assessments, Fees, Exam Results, Contacts (active count), Events, Notes & Info, Documents, then a "More" menu with Courses, Bank details, Visits (with counts). `?tab=supplementary` opens Notes & Info; an unknown tab falls back to Overview.
- **Only the open tab loads.** `page.tsx` (62 lines) loads the school, the write permission and four counts. Each tab has an async loader in `school-tab-content.tsx` / `school-tab-content-more.tsx`, wrapped in `<Suspense key={tab}>` with `school-tab-skeleton.tsx` as fallback. Before this, about 33 queries ran on every tab view. The unused `getSchool{SupInfo,Fee,EntranceExam,AcademicResult,Note}Count` queries are removed.
- **Overview** (`school-overview.tsx`). "School details" card (type, gender with co-ed from, phase, religion, pupils, boarders with ages, address block, website / email / telephone as links, fax only when set) and "Admissions" card (accepting applications, status, child visa with minimum age, general visa, current course fee and year), then remarks, keywords and placement history. Quick Actions, the separate Contact Information and Address cards, and the Visa card are gone.
- **Notes & Info** = notes plus supplementary info (`school-supplementary-info.tsx`, 25 per page, `?tab=notes&supPage=N`).
- **Write controls.** Hidden without Schools WRITE across the page: header edit / delete, fees, notes, bank details, academic results, courses, visits, documents (`DocumentManager` has an optional `canWrite`, default true, so the student page is unchanged) and supplementary info. Entrance assessments: add / delete need WRITE; edit stays for WRITE or exam-paper rights, because the exam team opens papers there (the exam desk links to `?tab=entrance-exams`). Server actions already enforced WRITE; this only removes dead buttons.
- **Status.** Unit tested (`src/lib/schools/__tests__/school-tabs.test.ts`, suite 947 tests). Exam results summary and fee years follow in phase 4.

---

## 7. Document Export Architecture

Two client-facing documents are generated server-side: the Selected School List
(`src/lib/schools/`) and the student Brief Introduction (`src/lib/brief-intro/`).
Both follow the same layering. The exam cover slip (§7.1) is a third PDF export that
copies it, and a fourth should do the same rather than invent a variant.

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

### 7.1 Exam cover slip (third PDF export, 2026-10-12)

A sheet placed on the candidate's seat: one A4 page per candidate in seat order (a group
examination gives one page per student). Opened from the exam desk row action "Cover slip".

- **Route:** `GET /api/exams/cover-slip/pdf?booking=<uuid>` (`src/app/api/exams/cover-slip/pdf/route.ts`).
  Checks in order: signed in (401), Exams access (403), valid id (400), booking exists (404),
  an examination or group examination that is not cancelled (400), at least one candidate (400).
  Refusals are a short readable HTML page, because the route opens in a browser tab. Success:
  `application/pdf`, `Content-Disposition: inline`, `Cache-Control: private, no-store`. A render
  failure answers 500 and logs no student data.
- **Layering** (same as above, no query module of its own): `buildCoverSlips`
  (`src/lib/exams/cover-slip-shaping.ts`, pure) -> `coverSlipHtml` (`cover-slip-html.ts`, plain
  strings escaped with the shared `escapeHtml` from `src/lib/pdf/escape-html.ts`, not React) ->
  `renderDocumentPdf` -> route. The renderer's footer uses the same `escapeHtml`.
- **Tracing entry:** `next.config.ts` has its own `outputFileTracingIncludes` key
  `/api/exams/cover-slip/pdf` (rule 2). Without it the route works locally and fails only deployed.
- **Content per slip:** student name and code, an empty seat box, school, date, start and end
  time in Hong Kong time, room (or "Online"), invigilator, assessment, chosen papers with durations.
  Invigilator = staff on the booking with the role "officer"; none, then the organiser; none,
  then a line to write on. A room without a value also gets a line to write on. School,
  assessment and papers are left out when unknown.
- **One sheet per candidate:** `needsCompactLayout` estimates a slip's printed height (Chinese,
  Japanese and Korean characters count double) and switches that slip to a smaller setting when
  it would not fit.
- **Tests:** `src/lib/exams/__tests__/cover-slip.test.ts`, `cover-slip-one-sheet.test.ts`,
  `src/app/api/exams/cover-slip/pdf/__tests__/route.test.ts`.
- **Limits:**
  - Layout and field list are a first version: the customer's own template has not been shared,
    and one adjustment round is expected.
  - **Chinese fonts are unverified on the server.** No PDF export here (this one or the two
    older) bundles a Chinese font; each relies on fonts present where Chromium runs. Works on a
    developer Mac; on the deployed server Chinese characters may render as empty boxes. Check on
    a preview (`docs/deployment-guide.md` §7.1).
  - About 20 papers with very long titles can still spill onto a second page.
  - School comes from the booking only (bookings saved before the school was stored with them
    show none). A booking crossing midnight shows only the start date.
  - Verified: real PDFs rendered locally through the project renderer (ordinary, nearly empty,
    three worst-case slips = 3 pages, three slips with Chinese text = 3 pages). **Not yet
    checked:** the button in the running app with a real booking, and a deployed preview.

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
| Thin test coverage | Medium | Vitest configured; 543 tests in 36 files, concentrated on permissions, export pipelines and scheduler pure helpers. No E2E |
| No CI/CD pipeline | Medium | No `.github/workflows/` found. `npm run check:permissions` is written and passing but not wired to CI |
| `/reports` not implemented | Low | Sidebar link exists, no page yet. `/settings` now has the Access Levels section |
| No permission audit log | Medium | Access-right changes are not recorded. Cheaper to add before the matrix is in real use than after |
| Env var naming inconsistency | Low | Server client reads `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY`; tooling/docs may still reference `NEXT_PUBLIC_SUPABASE_ANON_KEY` |
