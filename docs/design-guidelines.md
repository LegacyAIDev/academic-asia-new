# Design Guidelines

**Last updated:** 2026-10-22

This document covers the visual design system, component conventions, and UX patterns used across Academic Asia. It is the reference for anyone building or modifying UI.

---

## 1. Design System Foundation

The UI is built on **shadcn/ui** — a collection of Radix UI primitives with Tailwind CSS styling. Components are copied into the codebase (`src/components/ui/`) rather than installed as a black-box library, which means they can be customized directly.

**Key principle**: Always use an existing primitive before building something new. Check `src/components/ui/` first. If a primitive is missing, add it with:

```bash
npx shadcn add <component-name>
```

---

## 2. Typography

The app uses the browser's default sans-serif font stack applied via `font-sans antialiased` on the `<body>` element. No custom fonts are loaded.

| Usage | Tailwind class |
|---|---|
| Page headings | `text-2xl font-semibold` or `text-xl font-semibold` |
| Section headings | `text-lg font-medium` |
| Body text | Default (no class needed) |
| Muted/secondary text | `text-muted-foreground` |
| Small labels | `text-sm` |
| Tiny captions | `text-xs text-muted-foreground` |

---

## 3. Color System

Colors are defined via CSS custom properties (Tailwind v4 convention) and support both light and dark modes via `next-themes`.

Use semantic color tokens rather than raw Tailwind colors:

| Token | Usage |
|---|---|
| `background` | Page background |
| `foreground` | Primary text |
| `card` / `card-foreground` | Card backgrounds |
| `primary` / `primary-foreground` | Primary action buttons |
| `secondary` / `secondary-foreground` | Secondary/ghost actions |
| `muted` / `muted-foreground` | Subdued backgrounds and text |
| `border` | Dividers and input borders |
| `destructive` / `destructive-foreground` | Delete/danger actions |
| `accent` | Hover states |

Avoid using raw color utilities like `bg-blue-500` for interactive elements — they won't adapt to theme changes.

---

## 4. Layout & Spacing

The dashboard shell is a fixed sidebar + scrollable main content area. The sidebar is rendered by `src/components/layout/sidebar.tsx` and the header by `src/components/layout/header.tsx`.

Page content uses standard padding:
- Container: `p-6` or `px-6 py-4`
- Section gaps: `space-y-4` or `space-y-6`
- Card padding: `p-4` or `p-6`

Grid layouts for detail pages:
- 2-column on desktop: `grid grid-cols-1 md:grid-cols-2 gap-4`
- Full-width sections: no grid wrapper

---

## 5. Component Patterns

### 5.1 Cards

Use the `Card`, `CardHeader`, `CardTitle`, `CardContent` primitives from `src/components/ui/card.tsx` for grouping related content on detail pages.

```tsx
<Card>
  <CardHeader>
    <CardTitle>Contact Information</CardTitle>
  </CardHeader>
  <CardContent>
    {/* content */}
  </CardContent>
</Card>
```

### 5.2 Data Tables

Use the `Table`, `TableHeader`, `TableRow`, `TableHead`, `TableBody`, `TableCell` primitives. For empty states, render a centered message inside a `TableRow` with `colSpan`.

```tsx
{items.length === 0 && (
  <TableRow>
    <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
      No records found.
    </TableCell>
  </TableRow>
)}
```

### 5.3 Dialogs (Create/Edit Modals)

Sub-entity creation and editing happens in `Dialog` modals. Pattern:

- Dialog trigger is a `Button` with `variant="outline"` and a `+` or edit icon.
- `DialogHeader` contains the action title (e.g., "Add Contact", "Edit Contact").
- Form is inside `DialogContent`.
- `DialogFooter` has Cancel (closes dialog) and Submit buttons.
- On successful Server Action response, close the dialog via controlled `open` state.

```tsx
const [open, setOpen] = useState(false)

async function onSubmit(values: FormValues) {
  const result = await createContact(values)
  if (!result.success) {
    toast.error(result.error)
    return
  }
  toast.success('Contact added')
  setOpen(false)
}
```

### 5.4 Buttons

| Variant | Usage |
|---|---|
| `default` | Primary CTA (Save, Create) |
| `outline` | Secondary actions (Add sub-entity, Cancel) |
| `ghost` | Inline table actions (Edit icon button) |
| `destructive` | Delete confirmation |
| `link` | Navigation-style text links |

Always use `size="sm"` for buttons inside tables and dialogs.

### 5.5 Forms

Form fields use `FormField`, `FormItem`, `FormLabel`, `FormControl`, `FormMessage` from `src/components/ui/form.tsx` (react-hook-form integration).

```tsx
<FormField
  control={form.control}
  name="email"
  render={({ field }) => (
    <FormItem>
      <FormLabel>Email</FormLabel>
      <FormControl>
        <Input placeholder="email@example.com" {...field} />
      </FormControl>
      <FormMessage />
    </FormItem>
  )}
/>
```

Use `Select` (not a plain `<select>`) for dropdowns, `Checkbox` for booleans, `Textarea` for multi-line text.

### 5.6 Select Dropdowns

Reference data (nationalities, departments, statuses) is loaded from Supabase and passed to client form components as a prop array. Always use the shadcn `Select` primitive:

```tsx
<Select onValueChange={field.onChange} defaultValue={field.value}>
  <SelectTrigger>
    <SelectValue placeholder="Select nationality" />
  </SelectTrigger>
  <SelectContent>
    {nationalities.map(n => (
      <SelectItem key={n.id} value={String(n.id)}>{n.label}</SelectItem>
    ))}
  </SelectContent>
</Select>
```

### 5.7 Toasts

Use `sonner` via `toast.success()` and `toast.error()`. The `<Toaster>` is mounted globally in `src/app/layout.tsx` with `richColors` and `position="bottom-right"`.

```typescript
import { toast } from 'sonner'

toast.success('Student saved')
toast.error('Failed to save: ' + result.error)
```

### 5.8 Filters

List pages have filter UIs (`students-filters.tsx`, `schools-filters.tsx`, `events-filters.tsx`). Filters use URL search params (not local state) so they are bookmark-able and shareable.

### 5.9 Empty States

When a list or section has no data, show a helpful, non-alarming message:

```tsx
<p className="text-sm text-muted-foreground text-center py-6">
  No contacts added yet.
</p>
```

---

## 6. Icons

Use **lucide-react** for all icons. Choose icons that match the semantic action:
- Add/create: `Plus`
- Edit: `Pencil` or `Edit`
- Delete: `Trash2`
- Save: `Save`
- Search: `Search`
- Filter: `Filter`
- Close/Cancel: `X`
- Expand/Collapse: `ChevronDown` / `ChevronUp`
- External link: `ExternalLink`

Default icon size in buttons: `h-4 w-4`. Slightly larger in section headers: `h-5 w-5`.

---

## 7. Responsive Design

The app is primarily a desktop internal tool. The `use-mobile.ts` hook is available for responsive adaptations.

- Sidebar collapses or hides on mobile (managed by `sidebar.tsx`).
- Detail pages stack sections vertically on narrow screens.
- Tables may need horizontal scroll on mobile: wrap in `overflow-x-auto`.

Full mobile QA has not been completed — treat mobile as best-effort for the current phase.

---

## 8. Dark Mode

`next-themes` is installed and the theme toggle is in the header. All component colors should use the semantic token system (section 3) so they adapt automatically. Test both modes when adding new UI.

---

## 9. Loading & Error States

- Use Suspense boundaries (`loading.tsx`) at the page level for async Server Components.
- For client-side async operations (form submission), disable the submit button and show a loading spinner while pending:

```tsx
<Button type="submit" disabled={form.formState.isSubmitting}>
  {form.formState.isSubmitting ? 'Saving...' : 'Save'}
</Button>
```

- For data fetch errors in Server Components, render a simple error message rather than crashing the page.

---

## 10. Calendar & Scheduler UI

The event scheduler (one-to-one interview slots under `events/[type]/[id]/scheduler/`) is a hand-built slot grid using `@dnd-kit/core` and shadcn primitives, so it follows the normal Tailwind tokens. The Scheduler module calendar uses FullCalendar v7; its theme variables are mapped to the shadcn tokens in `src/components/scheduler/scheduler-calendar.css` (see Scheduler conventions).

Drag-and-drop behavior uses `@dnd-kit/core`. The `drag-overlay.tsx` component renders a floating preview of the dragged item — keep this visually simple (student name + exam type label).

## 11. Scheduler Conventions (Rooms, Bookings, Exam Scheduling)

Subject: physical seats in physical rooms on Hong Kong office floors. Every screen answers one question — which room or colleague is free, and can I book it now.

- **Tokens only.** `primary` for actions/selection, `card` for surfaces, `muted` for secondary text/quiet backgrounds, `border` for hairlines. Booking-type hues come only from `src/lib/scheduler/colors.ts` and appear only as an accent — the 3px left bar on calendar cards, the type dot, type badges, and the details ribbon. Never use raw Tailwind colours or per-room custom swatches as the primary identifier.
- **Type.** System sans; hierarchy through weight/tracking, not fonts. `tabular-nums` on every time, count, and capacity figure. Eyebrows are `text-[11px] uppercase tracking-wide text-muted-foreground` — used for floor labels, form sections, and sources.
- **Room chip — the signature component** (`src/components/scheduler/room-chip.tsx`): a two-tone tag ("14/F · Exam Room") with a thin capacity meter underneath. Reuse it wherever a room appears — rooms admin, booking room recommendations, the details ribbon, the student agenda. One component, every home; don't rebuild a room label inline.
- **Shared booking pieces:** `booking-status-badge.tsx` (status pill, tokens only), `booking-form-section.tsx` (form section wrapper driving the When · Where · Who · Details eyebrow rhythm), `booking-details-ribbon.tsx` (type badge + status badge + room chip row atop the details sheet), `booking-form-reason.tsx` (cancel/reschedule reason field).
- **Command bar:** one rounded-xl card holding view tabs, date navigation + mode segmented control, people picker, and New booking. Filters live as a quiet chip row beneath, with an active-filter count and Clear — reuse this pattern for other scheduler-style toolbars.
- **Calendar cards:** 3px left accent in type colour, 6px radius, 12px text; dashed border for pending; struck + faded for cancelled. Motion is removed under `prefers-reduced-motion` (enforced in `scheduler-calendar.css`).
- **Date label = month picker.** The date label in the command bar is a button (`scheduler-date-picker.tsx`) that opens a popover month calendar (Monday first) to jump to any day (month and year dropdowns in the caption); the timezone eyebrow stays under the label. Keep the prev/next/today arrows next to it for the common short hops.
- **Back link follows the origin.** Booking page back link wording comes from `returnLabel` ("Back to calendar" / "Back to exams" / "Back to student"); never hard-code it.
- **Offer only what is allowed.** An action appears only when the shared permission helper allows it (`canCancelBooking`, same rule in menu and edit dialog); never show an action that the server then refuses.
- **Right-click menu** (`calendar-context-menu.tsx`, shadcn `ContextMenu`). Two target types, items filtered by role, never shown-then-failing:
  - On a booking: Open details, Open in new tab (always); Edit… (scheduler WRITE, active booking); Confirm (`EXAMS WRITE`, pending only); Cancel booking… (WRITE, active; confirmed exams also need `EXAMS WRITE`; destructive text colour); then a separator and Copy details, plus Copy for family on examinations.
  - On an empty slot: "New booking on DD/MM/YYYY at HH:mm" (WRITE) plus Go to today. Without WRITE the first row becomes a quiet "View only" hint instead.
  - Items that open a dialog are deferred one tick so the menu closes first. The menu is off on touch screens (long press is select/drag). It is a shortcut layer only: every action must also exist in the details panel or toolbar.
- **View-only state.** Users without scheduler WRITE see a "View only" outline badge beside a disabled New booking button, with a tooltip explaining how to get access (Ask a manager for Scheduler edit access). Never hide the primary action silently; explain why it is unavailable. The wrapper is focusable so keyboard users can reach the tooltip.
- **Copy buttons.** Ghost buttons labelled "Copy details" (every booking) and "Copy for family" (examinations only), `booking-copy-buttons.tsx`, shown on the details panel and booking page and mirrored in the right-click menu. Result is confirmed with a sonner toast ("Booking details copied" / "Family details copied"); failure toast tells the user to select the text instead.
- **History:** a dot-and-line timeline, reason shown as a quiet quote — see `booking-history-list.tsx`.
- **Rejected as generic:** gradient headers, raw-colour status pills, icon-in-circle decoration, shadows as hierarchy, dashboard-style stat tiles for rooms, hover scale effects, per-room custom colour swatches as primary identifier.
- **Quality floor:** `focus-visible:ring-2 ring-ring` on custom interactive elements, targets >= 36px, wraps correctly at 400px, dark mode via tokens only.
- **Copy:** sentence case, plain verbs. Empty states invite the next action ("Add your first room", "Book a consultation to add the first one").

Source: `plans/260912-0136-scheduler-rooms-meetings-exams/design-notes.md`.

## 12. Application and School Profile Conventions

The application page (`students/[id]/applications/[applicationId]/`) and the school page tabs follow the scheduler conventions above (tokens only, system sans, eyebrows, `tabular-nums`, no gradient headers, icon tiles or shadows as hierarchy).

- **Building blocks:** `application-section.tsx` holds `Eyebrow` (11px uppercase label with an optional count), `Field` (label/value inside a `<dl>`), `Section` (card surface with an eyebrow) and `SubSection` (hairline-separated group inside a card).
- **One record card:** the application record is a single card with hairline groups (Status, Course & entry, Referral & scholarship, Event & audition, School visit, Remarks). Groups with nothing recorded are folded into one "Not recorded: …" line instead of rows of dashes.
- **Journey route — the application page's signature** (`application-journey.tsx`): six stops on one line, filled in `primary` up to the current step (`destructive` when the application is closed), with "since {date}" when the status change was recorded. Below `sm` it becomes a progress bar with "Step n of 6".
- **Timeline:** the same dot-and-line pattern as `booking-history-list.tsx`; the newest entry carries the accent dot, status changes a darker dot.
- **Year blocks — the school page's exam results** (`academic-results-summary.tsx`): one block per exam year, newest first. Year heading, then an eyebrow line per exam type (GCSE, A Level, others), each a `dl` grid narrowest band first: band label over a bold figure. Every exam type keeps the same columns in every year shown (per grading scale: 9–1 numbers apart from letters), with a quiet "—" for a band not published that year, so a band reads straight down the years. **Staircase — the signature:** a 3px `primary` bar on a `muted` track under each published figure, filled to its share (percent of 100, IB points of 45); bands are cumulative, so the bars climb along a line. No track under a gap. A one-line note explains cumulative bands when ranges are shown. "Copy summary" copies the published figures, one line per year, and confirms with a toast (error toast if the clipboard is blocked); a source note sits below. On a phone the year, exam type and grid stack; a long line scrolls inside itself (keyboard-focusable); range labels keep "9–8" together with word joiners. Tokens only, no colour tint.
- **Fees:** grouped under eyebrow rows per fee type (and per year in "All years") instead of a type badge on every row; amounts in `tabular-nums`.
- **Headers:** an eyebrow ("School application", "School") above the name; status badges keep the shared category colours from `src/lib/applications/application-display.ts` so the list and the page match.

## 13. Student Form Conventions

- **Long-list picker** (`present-school-picker.tsx`): a Popover with a cmdk `Command` using `shouldFilter={false}` and the app's own filter, for lists over 1,000 rows. At most 50 rows are rendered, with a quiet "Keep typing to narrow down" line.
- **Add to list** is the last item, only when the user may add, nothing matches the typed name exactly and the name is valid. Save stays disabled while the add runs.
- **Legacy text** (not yet on the list) is shown as typed with a muted hint, and the search starts from it. A "Clear" item unlinks.
- **List-management page** (`students/present-schools`): a toolbar card (search, source filter, count, Add button) above a list card with an eyebrow header. The full list loads once and filters in the browser; 100 rows then "Show more". The edit dialog shows a live "N students will show the new name" note. Add/Edit buttons are hidden without WRITE.
- **Family tab** (`student-family.tsx`), eyebrow group headings with counts. **Parents and guardians** are cards built around reaching them: relationship eyebrow with "Main contact" (only that one in `primary`), name, occupation, then mobile/home/office and email as tap-to-call / tap-to-email links (a field that is not one callable number stays text); no avatars, no badges. **The family line — the tab's signature** (`family-sibling-line.tsx`): brothers and sisters and this student as dots on one line, eldest first by birth date ("Elder brother", "Younger sister"); this student's dot filled `primary`, a linked student's dot outlined `primary` with "View profile", a typed-in one outlined muted with "Not linked to a student"; vertical on a phone. Possibly-family suggestions get a dashed dot. **Other family** is one quiet row each. A link made from the other student's side says "Linked from their profile" and has no Edit/Delete. Targets ≥ 36px.
- **Suggestion card** (`family-suggestions.tsx`): dashed-border card under the Family groups, eyebrow "Possibly family in the system" with the count. Each row shows the student and what matched (never the phone or email), a one-click "Link as brother/sister" button (toast on success; the row disappears) and a ghost "Not family" that hides the row for the visit only. Hidden without WRITE.
- **Student picker** (`family-student-picker.tsx`): the list is too large for the browser (26,000+ students), so it searches the server as staff type and shows a status line. Lists that fit use the self-filtered picker above.
- Tokens only; no new colours.
