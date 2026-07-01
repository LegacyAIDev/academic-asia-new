# Academic Asia — Student Management System

A comprehensive student recruitment and school application management platform for an international education-recruitment agency. It manages students, partner schools, staff, and the full lifecycle of recruitment events (expos, interviews, auditions, group entrance exams, seminars, briefings, assessments, and scholarship events).

This project is a full rebuild of a legacy system, migrating existing data from CSV exports into a modern Next.js + Supabase stack.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16.0.10 (App Router), React 19 |
| Language | TypeScript 5 |
| Database / Auth | Supabase (Postgres + Auth + SSR sessions) |
| Styling | Tailwind CSS v4, shadcn/ui (53 Radix-based primitives) |
| Forms | react-hook-form + zod + @hookform/resolvers |
| Calendar | @schedule-x v4 with drag-and-drop + @dnd-kit/core |
| Charts | recharts |
| Toasts | sonner |

---

## Quick Start

### 1. Prerequisites

- Node.js 20+
- Supabase CLI (`npm i -g supabase`)
- A linked Supabase project

### 2. Environment Variables

Copy `.env.local.example` to `.env.local` and fill in:

```env
NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co

# NOTE: The server client reads NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY
# (the newer Supabase publishable-key name), NOT NEXT_PUBLIC_SUPABASE_ANON_KEY.
# Make sure this variable is set — the anon key alias alone will not work.
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY=<your-publishable-key>

# Service role key — server-only, never expose to browser
SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key>
```

### 3. Install & Run

```bash
npm install

# Push all migrations to your linked Supabase project
npm run db:push

# Regenerate TypeScript types from the database schema
npm run db:types

# Start the dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). You will be redirected to `/login` if not authenticated.

### 4. Useful Scripts

```bash
npm run build          # Production build
npm run type-check     # TypeScript type check (no emit)
npm run lint           # ESLint
npm run db:reset       # Reset linked DB to migration baseline (destructive)
```

---

## Project Structure

```
src/
├── app/
│   ├── (auth)/              # Login, forgot-password, reset-password
│   ├── (dashboard)/         # All protected app routes
│   │   ├── students/        # Student list, detail, new, edit
│   │   ├── schools/         # School list, detail, new, edit
│   │   ├── staff/           # Staff list, detail, new, edit
│   │   ├── events/[type]/   # Type-parameterized event pages + scheduler
│   │   └── exams/           # Exam management table
│   └── auth/callback/       # Supabase OAuth/email callback route
├── components/
│   ├── ui/                  # 53 shadcn/ui primitives
│   └── layout/              # Sidebar, Header
├── lib/
│   ├── supabase/
│   │   ├── client.ts        # Browser Supabase client (anon key)
│   │   ├── server.ts        # Server component client (cookie-based SSR)
│   │   ├── admin.ts         # Service role client — server-only
│   │   ├── middleware.ts    # Session refresh via updateSession()
│   │   ├── auth.ts          # getCurrentUser() — profile + admin_level
│   │   ├── actions/         # ~30 'use server' mutation files (one per domain)
│   │   └── queries/         # ~35 read/query files (one per domain)
│   ├── auth-utils.ts        # RBAC constants + hasMinLevel()
│   └── utils.ts             # cn() class merge helper
├── hooks/
│   └── use-mobile.ts
└── types/
    ├── database.ts           # Supabase-generated types
    └── database.types.ts     # Extended/aliased types
supabase/
├── migrations/              # 68 SQL migrations (001–068)
└── config.toml
scripts/                     # 34 one-off TypeScript data migration scripts
data/                        # Source CSVs + migration artifacts
requirements/                # Legacy spec docs and DB exports
```

---

## Authentication & Access Control

All routes except `/login`, `/forgot-password`, `/reset-password`, and `/auth/callback` are protected by Next.js middleware. Sessions are managed via `@supabase/ssr` cookie-based session refresh.

RBAC uses numeric admin levels (lower = more privileged):

| Level | Role |
|---|---|
| 0 | SUPER_ADMIN |
| 3 | MANAGER |
| 4 | SENIOR_STAFF |
| 6 | STAFF |
| 7 | JUNIOR_STAFF |
| 8 | BASIC |

The `admin_level` is injected into JWT `app_metadata` via a Postgres `custom_access_token_hook` (migration `065_custom_access_token_hook.sql`).

---

## Documentation

| Document | Description |
|---|---|
| [docs/project-overview-pdr.md](docs/project-overview-pdr.md) | Product overview & requirements |
| [docs/codebase-summary.md](docs/codebase-summary.md) | Codebase summary and file map |
| [docs/code-standards.md](docs/code-standards.md) | Coding standards and conventions |
| [docs/system-architecture.md](docs/system-architecture.md) | System architecture |
| [docs/project-roadmap.md](docs/project-roadmap.md) | Development roadmap |
| [docs/deployment-guide.md](docs/deployment-guide.md) | Deployment instructions |
| [docs/design-guidelines.md](docs/design-guidelines.md) | UI/UX design guidelines |

---

## Legacy Data Migration

To re-run the full data migration pipeline from source CSVs:

```bash
./remigrate.sh
```

Individual migration scripts live in `scripts/` and are numbered in dependency order (e.g., `1_migrate-profiles.ts` through `34_migrate-aa-test.ts`). They are run with `tsx`.

---

## Known Gotchas

- **Env var naming**: The server client reads `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY`, not the legacy `NEXT_PUBLIC_SUPABASE_ANON_KEY`. Both must be set if other tooling expects the old name.
- **RLS**: Row-Level Security policies are not yet enabled at the database level. Access control is enforced at the application layer (middleware + RBAC). This is a known security gap — see `docs/system-architecture.md`.
- **Settings/Reports pages**: Sidebar links for `/settings` and `/reports` exist but no pages are implemented yet.
