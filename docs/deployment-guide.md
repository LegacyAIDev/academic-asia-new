# Deployment Guide

**Last updated:** 2026-11-24

---

## Prerequisites

- Node.js 20+
- Supabase CLI: `npm i -g supabase`
- A Supabase project created at [supabase.com](https://supabase.com) (or via CLI)
- Access to the project's Supabase dashboard

---

## 1. Environment Variables

Copy `.env.example` to `.env.local` at the project root and fill it in. **Never commit `.env.local`.**

```env
# Supabase project URL
NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co

# IMPORTANT: The server Supabase client (src/lib/supabase/server.ts) reads
# NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY — this is the newer Supabase
# publishable key naming convention. The old name NEXT_PUBLIC_SUPABASE_ANON_KEY
# is NOT read by the server client and will be silently ignored.
# Set this correctly or sessions will fail to initialize.
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<your-publishable-anon-key>

# Secret key — NEVER expose to the browser or commit to git.
# Used by src/lib/supabase/admin.ts (staff/permission actions, cached reference
# lists, the migration scripts). SUPABASE_SERVICE_ROLE_KEY also works, for
# projects still on the older name.
SUPABASE_SECRET_KEY=<your-secret-key>

# FullCalendar Premium licence for the Scheduler. Empty uses the evaluation key.
NEXT_PUBLIC_FULLCALENDAR_LICENSE_KEY=

# Database password, only needed to apply migrations with psql (not read by the app).
SUPABASE_DB_PASSWORD=<your-database-password>
```

You can find the project URL and keys in the Supabase project dashboard under **Project Settings → API Keys**, and the database password under **Project Settings → Database**.

---

## 2. Link Supabase Project

```bash
# Log in to Supabase CLI
supabase login

# Link your project (run from repo root)
supabase link --project-ref <your-project-ref>
```

---

## 3. Database Setup

### 3.1 Applying migrations (live and test projects)

**Do not run a blanket `supabase db push`.** The live project's migration history has older drift from migrations applied by hand (see §5), so `db push` can try to re-apply or skip the wrong files. There is no `db:reset` npm script for this reason either — a reset replays from the CLI's own history, which does not match the live project.

Instead, for each new migration file:

1. Back up the affected tables first.
2. Apply the specific file(s) with `psql`, in one transaction:
   ```bash
   psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -1 -f supabase/migrations/<timestamp>_<name>.sql
   ```
   (`$DATABASE_URL` is the pooler connection string, using `SUPABASE_DB_PASSWORD`.)
3. Record the version in `supabase_migrations.schema_migrations` so the CLI's history stays accurate:
   ```sql
   insert into supabase_migrations.schema_migrations (version, name) values ('<timestamp>', '<name>');
   ```
4. Apply the same file(s) to the test project (Supabase `xzgqcummphcxpqoitgso`, see §10) as well as the live one.

Local development and the browser tests are the exception: `e2e/setup-local-db.sh` builds a throwaway local Supabase stack and replays every migration in `supabase/migrations/` from scratch (Docker + Supabase CLI + `psql`), so migrations must stay safe to run more than once. It patches two old migrations that only replay cleanly on an empty database (see the script's header comment).

### 3.2 Regenerate TypeScript Types

After any schema change, regenerate the database types:

```bash
npm run db:types
# equivalent: supabase gen types typescript --linked > src/types/database.ts
```

Commit the updated `src/types/database.ts` along with the migration.

---

## 4. Local Development

```bash
npm install
npm run dev
```

The app starts at [http://localhost:3000](http://localhost:3000). `src/proxy.ts` redirects unauthenticated requests to `/login`.

You do **not** need to run a local Supabase stack for normal development — the app connects to the hosted Supabase project specified in `.env.local`. The browser tests (`e2e/`) are the exception: they always run against a local stack, never the hosted database — see `npm run e2e:setup` in the README.

---

## 4a. Email filing (2026-10-28)

`supabase/migrations/20261028181144_filed_emails.sql` creates the `filed_emails` table and the private `filed-emails` storage bucket (25 MB per object) with its policies. Apply it with `psql` per §3.1, then regenerate types (`npm run db:types`); `src/types/database.ts` was edited by hand to match until then.

Email files are uploaded from the browser straight to storage through a signed upload URL, so no server action body limit applies. If uploads fail with a CORS error on a custom domain, check the project's storage settings allow the app's origin.

## 4b. Activity history triggers (2026-10-30)

`20261030182948_activity_log.sql` adds `*_activity` triggers to twelve tables (system-architecture 5.2f). A re-import through `remigrate.sh` or the numbered scripts would write one "System" activity row per record. Before a large load, disable them on the tables being loaded, for example:

```sql
alter table public.students disable trigger students_activity;
-- load…
alter table public.students enable trigger students_activity;
```

## 5. Legacy Data Migration

To populate the database from the legacy CSV exports in `data/`:

```bash
# Make the script executable if needed
chmod +x scripts/legacy-migration/remigrate.sh

# Run the migration pipeline (first batch of scripts; see scripts/legacy-migration/remigrate.sh)
./scripts/legacy-migration/remigrate.sh
```

`remigrate.sh` and the 43 numbered scripts live in `scripts/legacy-migration/` (moved out of the repo root). This runs the scripts in numbered order via `tsx`. Migration artifacts are written to `data/` (e.g., `school-courses-skipped.json`).

**Prerequisites for migration:**
- `SUPABASE_SECRET_KEY` (or the older `SUPABASE_SERVICE_ROLE_KEY`) must be set (migration scripts use the admin client)
- `NEXT_PUBLIC_SUPABASE_URL` must be set
- Source CSVs must be present in `data/`

**Application status history trigger.** Every insert or status/sub-status update on `student_applications` writes a row to `student_application_status_history` (trigger `student_applications_status_history`). A bulk import or re-import therefore writes one history row per application dated at import time. Disable the trigger for bulk loads, then re-enable it:

```sql
alter table public.student_applications disable trigger student_applications_status_history;
-- ... bulk load ...
alter table public.student_applications enable trigger student_applications_status_history;
```

If history rows were already written by an import, delete them before go-live (history is meant to start from real changes).

### 5-family. Family links migration (customer item 5)

Migration `20261022152919_student_contacts_related_student.sql` (adds `student_contacts.related_student_id`) was applied through the Supabase MCP, then renamed to the applied version. Other environments get it with `psql` per §3.1. No data import.

Migration `20261022165842_student_family_suggestions.sql` (function `student_family_suggestions` and two indexes, phase 3) was applied the same way.

### 5a. Present schools import (customer item 6)

Migration `20261021204752_present_schools.sql` was applied through the Supabase MCP (the CLI login is unavailable), then renamed to the applied version. Other environments get it with `psql` per §3.1.

Load the Hong Kong school list and link students whose typed school matches exactly. Always dry-run first:

```bash
npx tsx scripts/legacy-migration/43_import-present-schools.ts --dry-run
npx tsx scripts/legacy-migration/43_import-present-schools.ts
# optional: --file <path>  (default requirements/Hong_Kong_All_Primary_and_Secondary_Schools.txt)
```

- Needs `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SECRET_KEY` in `.env.local`. Reads in pages of 1,000.
- Safe to re-run: unchanged schools are not rewritten and linked students are skipped.
- Links exact key matches only, writes only an empty `present_school_id`, never changes the typed `present_school` text.
- Aborts if two list schools share a key. A staff-added school with the same `match_key` as a list entry takes the list spelling (`source` becomes `hk_list`).
- Writes a local report to `data/present-school-import-report.json` (not committed).
- The students `updated_at` trigger fires when a student is linked.
- Undo links: `update students set present_school_id = null where ...;`

**Warning:** once list schools have been renamed on the Current Schools page, do not re-run this script as-is. A rename replaces the old name, so the import would add the original list names again as new schools.

Result on 2026-10-22: 1,230 schools; 11,938 of 23,547 students with a school linked.

---

## 6. Production Build

```bash
npm run build
npm run start
```

Verify there are no type errors or lint errors before building:

```bash
npm run type-check
npm run lint
```

---

## 7. Deploying to Vercel (Recommended)

1. Push the repository to GitHub.
2. Import the repository in Vercel.
3. Set the environment variables in Vercel project settings (Settings → Environment Variables):
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
   - `SUPABASE_SECRET_KEY` (or `SUPABASE_SERVICE_ROLE_KEY`)
   - `NEXT_PUBLIC_FULLCALENDAR_LICENSE_KEY`
4. Deploy. Vercel automatically runs `npm run build`.

**Supabase Auth redirect URL**: After deploying, add your Vercel production URL to the Supabase Auth allowed redirect URLs in the Supabase dashboard (Authentication → URL Configuration). Include:
- `https://your-domain.vercel.app/auth/callback`
- `https://your-custom-domain.com/auth/callback` (if applicable)

### 7.1 Check the PDF exports after each deploy

The app has three PDF exports (Selected School List, Brief Introduction, exam cover slip), all rendered by headless Chromium on the server. Two problems show up only once deployed, so check on the preview before promoting:

1. **Missing tracing entry.** Every PDF route needs its own `outputFileTracingIncludes` entry in `next.config.ts`. A missing one works locally and fails only on the deployment. Open one cover slip (exam desk, "Cover slip" on a row with a candidate) and confirm a PDF opens.
2. **Chinese fonts.** No PDF export bundles a Chinese font; they use fonts present on the server. Open a PDF containing a Chinese name (for example a cover slip or Brief Introduction for such a student) and confirm the characters render and are not empty boxes. Not yet verified on a deployment; if boxes appear, a font must be bundled for all three exports.

---

## 8. Common Setup Gotchas

### Env var naming mismatch

The server Supabase client reads `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`. If you only set `NEXT_PUBLIC_SUPABASE_ANON_KEY` (the older convention), the server client will be initialized with `undefined` as the key. This causes all server-side Supabase calls to fail silently. Double-check both variable names are set in your deployment environment.

### custom_access_token_hook not firing

If RBAC checks always return BASIC level, the custom access token hook may not be enabled. Verify migration `065_custom_access_token_hook.sql` was applied and that the hook is enabled in the Supabase dashboard (Database → Hooks or via the migration itself).

### Session cookie issues in production

If users are getting unexpectedly logged out, check that:
- The proxy is running on all protected routes (verify `matcher` in `src/proxy.ts`).
- The Supabase project URL matches the deployment URL (no mixed http/https).
- Cookies are not being blocked by a CDN or proxy stripping `Set-Cookie` headers.

### Migration scripts failing

Data migration scripts require `SUPABASE_SECRET_KEY` (or `SUPABASE_SERVICE_ROLE_KEY`) and a `dotenv` setup. If running outside of the shell with `.env.local`, ensure the env vars are exported before running `./scripts/legacy-migration/remigrate.sh`.

---

## 9. Environment Summary

| Variable | Required | Scope | Purpose |
|---|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Public (browser + server) | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Yes | Public (browser + server) | Anon/publishable key for user-context requests |
| `SUPABASE_SECRET_KEY` | Yes | Server-only | Admin client: staff/permission actions, cached reference lists, migration scripts. `SUPABASE_SERVICE_ROLE_KEY` also accepted |
| `NEXT_PUBLIC_FULLCALENDAR_LICENSE_KEY` | No | Public (browser + server) | Scheduler's FullCalendar Premium licence; empty uses the evaluation key |
| `SUPABASE_DB_PASSWORD` | Migrations only | Local/operator only | Applying migrations with `psql` (§3.1); not read by the app |

See `.env.example` for the authoritative list.

---

## 10. Test Environment

The client tests in a separate environment, kept apart from live data:

| | App | Database |
|---|---|---|
| Live | Vercel project `academic-asia-new` | Supabase `sotfycrfhwanjbcemrai` |
| Test | Vercel project `academic-asia-test`, https://academic-asia-test.vercel.app | Supabase `xzgqcummphcxpqoitgso`: schema and reference data, sample students, no personal data |

Both deploy from `main`. Apply every new migration to the test project the same way as live (§3.1). `npm run seed:test-env` (`scripts/seed-test-env.mjs`) seeds one login per access level and sample students on the test project; it refuses to run against the live project ref and is safe to run more than once.
