# Academic Asia CRM

Student recruitment and school placement system for Academic Asia (Hong Kong). It manages students and their families, partner schools, applications, entrance exams, the room and exam scheduler, events, staff and their access levels.

It replaced a legacy system; the old data was imported from CSV exports (see [Legacy data](#legacy-data)).

## Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router, server components and actions), React 19 |
| Language | TypeScript 5 |
| Database and auth | Supabase (Postgres, Auth, Storage) via `@supabase/ssr` |
| UI | Tailwind CSS v4, shadcn/ui on Radix, lucide icons, sonner toasts |
| Forms | react-hook-form + zod (scheduler), server actions elsewhere |
| Calendar | FullCalendar v7 Premium (scheduler), @dnd-kit (event scheduler) |
| Rich text | Tiptap |
| Tests | Vitest (unit), Puppeteer (browser, `e2e/`) |
| Hosting | Vercel, region `dub1` (next to the Supabase project in eu-west-1) |

## Getting started

Prerequisites: Node.js 20+, npm, and for the browser tests Docker, the Supabase CLI and `psql`.

```bash
cp .env.example .env.local   # fill in from Supabase: Project Settings -> API Keys
npm ci
npm run dev                  # http://localhost:3000, redirects to /login
```

| Variable | Purpose |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Project URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Browser key |
| `SUPABASE_SECRET_KEY` | Server-only key (admin actions, cached lists, scripts). `SUPABASE_SERVICE_ROLE_KEY` also works |
| `NEXT_PUBLIC_FULLCALENDAR_LICENSE_KEY` | Scheduler licence; empty uses the evaluation key |

## Scripts

```bash
npm run build              # production build
npm run type-check         # tsc --noEmit
npm run lint               # eslint
npm test                   # unit tests (vitest)
npm run check:permissions  # every page and action guarded by a permission
npm run db:types           # regenerate src/types/database.ts from the linked project
npm run e2e:setup          # local Supabase stack for the browser tests (Docker)
npm run seed:test-env      # sample logins and students on the test project
```

### Browser tests

They run against a local Supabase stack, never a hosted database:

```bash
npm run e2e:setup && source /tmp/aa-localdb/env.sh
npm run build && npx next start -p 3100
node e2e/students-list.e2e.mjs          # any e2e/*.e2e.mjs, or e2e/app-sweep.mjs
```

`email-filing` and `activity-log` also need real mail files (`offer.eml`, `sent.msg`) in `/tmp/aa-localdb/fixtures`.

## Database changes

Migrations live in `supabase/migrations` and must be safe to run more than once (the local setup replays them all). The live project's migration history has older drift, so do not run a blanket `supabase db push`: apply the new files with `psql` in one transaction, record their versions in `supabase_migrations.schema_migrations`, and back up the affected tables first. Apply them to the test project too.

## Environments

| | App | Database |
|---|---|---|
| Live | Vercel project `academic-asia-new` | Supabase `sotfycrfhwanjbcemrai` |
| Test (for the client) | Vercel project `academic-asia-test`, https://academic-asia-test.vercel.app | Supabase `xzgqcummphcxpqoitgso`: schema and reference data, sample students, no personal data |

Both deploy from `main`.

## Project layout

```
src/
  app/
    (auth)/            login, password reset
    (dashboard)/       the signed-in app: students, schools, scheduler, exams,
                       events, staff, tasks, settings
    api/               PDF and spreadsheet exports, cached lists
    register/          families' one-use online registration form
  components/
    ui/                shadcn primitives (plus link.tsx: hover-only prefetch)
    layout/            app shell, sidebar, header
    features/          shared record features: attachments, notes, activity, emails
    scheduler/         booking forms and calendar pieces
  lib/
    supabase/          clients (server, browser, admin), auth, actions/, queries/
    permissions/       modules, access levels, guards
    <domain>/          pure helpers per area (students, schools, exams, scheduler...)
  proxy.ts             session refresh and sign-in redirect (Next 16 proxy)
  types/database.ts    generated Supabase types
supabase/migrations/   SQL migrations
e2e/                   browser tests and the local database setup
scripts/               test-environment seed, permission coverage check
scripts/legacy-migration/  one-off import of the old system's data
docs/                  architecture, standards, deployment, roadmap
```

## Access control

Every page and server action checks a permission module (`src/lib/permissions`): access per module is none, read or write, set per access level in Settings and overridable per person. Levels are numeric, lower is more senior:

| Level | Role |
|---|---|
| 0 | Super admin |
| 3 | Manager |
| 4 | Senior staff |
| 6 | Staff |
| 7 | Junior staff |
| 8 | Basic |

Row-level security is on but mostly permissive (any signed-in user may read), so the app's permission checks are what restrict access. Exam paper files are the sensitive case; see `docs/system-architecture.md`.

## Performance notes

- Links prefetch on hover, not when they appear (`src/components/ui/link.tsx`); every page is rendered per request, so on-screen prefetch meant a server render per visible link.
- Reference lists are cached on the server (`src/lib/supabase/queries/cached-lists.ts`) and expired by the actions that edit them.
- The browser reuses a page for 30 seconds (`staleTimes` in `next.config.ts`).
- Slow counts stream in behind `<Suspense>` instead of holding up the page.

## Legacy data

`scripts/legacy-migration/` holds the numbered scripts that imported the old system's CSV exports (run with `tsx`, in number order, from the repo root). They are kept for reference and for re-running a single import; `remigrate.sh` there runs the first batch.

## Documentation

| Document | |
|---|---|
| [docs/project-overview-pdr.md](docs/project-overview-pdr.md) | Product overview and requirements |
| [docs/codebase-summary.md](docs/codebase-summary.md) | File map |
| [docs/code-standards.md](docs/code-standards.md) | Conventions |
| [docs/system-architecture.md](docs/system-architecture.md) | Architecture |
| [docs/deployment-guide.md](docs/deployment-guide.md) | Deployment |
| [docs/project-roadmap.md](docs/project-roadmap.md) | Roadmap and change log |
| [docs/design-guidelines.md](docs/design-guidelines.md) | UI guidelines |
| [docs/scheduler-user-guide.md](docs/scheduler-user-guide.md) | Scheduler guide for staff |
