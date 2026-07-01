# Design Guidelines

**Last updated:** 2026-06-24

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

The event scheduler uses `@schedule-x` with the `theme-shadcn` theme package, ensuring it blends with the existing design system. The scheduler's visual configuration (colors, fonts) should be adjusted through the `@schedule-x/theme-shadcn` API rather than overriding CSS directly.

Drag-and-drop behavior uses `@dnd-kit/core`. The `drag-overlay.tsx` component renders a floating preview of the dragged item — keep this visually simple (student name + exam type label).
