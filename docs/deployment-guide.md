# Deployment Guide

**Last updated:** 2026-06-24

---

## Prerequisites

- Node.js 20+
- Supabase CLI: `npm i -g supabase`
- A Supabase project created at [supabase.com](https://supabase.com) (or via CLI)
- Access to the project's Supabase dashboard

---

## 1. Environment Variables

Create `.env.local` at the project root. **Never commit this file.**

```env
# Supabase project URL
NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co

# IMPORTANT: The server Supabase client (src/lib/supabase/server.ts) reads
# NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY — this is the newer Supabase
# publishable key naming convention. The old name NEXT_PUBLIC_SUPABASE_ANON_KEY
# is NOT read by the server client and will be silently ignored.
# Set this correctly or sessions will fail to initialize.
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY=<your-publishable-anon-key>

# Service role key — NEVER expose to the browser or commit to git
# Used only by src/lib/supabase/admin.ts (data migration scripts, admin operations)
SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key>
```

You can find both keys in your Supabase project dashboard under **Project Settings → API**.

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

### 3.1 Push Migrations

Apply all 68 SQL migrations to your Supabase project:

```bash
npm run db:push
# equivalent: supabase db push
```

This is safe to run repeatedly — migrations already applied are skipped.

### 3.2 Reset (Destructive)

To wipe the linked database and replay all migrations from scratch:

```bash
npm run db:reset
# equivalent: supabase db reset --linked
```

**Warning:** This deletes all data. Use only in development or when re-running the legacy data migration.

### 3.3 Regenerate TypeScript Types

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

The app starts at [http://localhost:3000](http://localhost:3000). Middleware redirects unauthenticated requests to `/login`.

You do **not** need to run a local Supabase stack — the app connects to the hosted Supabase project specified in `.env.local`. If you want a fully local database, run `supabase start` (requires Docker) and update your env vars to point at the local instance.

---

## 5. Legacy Data Migration

To populate the database from the legacy CSV exports in `data/`:

```bash
# Make the script executable if needed
chmod +x remigrate.sh

# Run the full migration pipeline
./remigrate.sh
```

This runs all 34 scripts in `scripts/` in numbered order via `tsx`. Migration artifacts are written to `data/` (e.g., `school-courses-skipped.json`).

**Prerequisites for migration:**
- `SUPABASE_SERVICE_ROLE_KEY` must be set (migration scripts use the admin client)
- `NEXT_PUBLIC_SUPABASE_URL` must be set
- Source CSVs must be present in `data/`

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
   - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
4. Deploy. Vercel automatically runs `npm run build`.

**Supabase Auth redirect URL**: After deploying, add your Vercel production URL to the Supabase Auth allowed redirect URLs in the Supabase dashboard (Authentication → URL Configuration). Include:
- `https://your-domain.vercel.app/auth/callback`
- `https://your-custom-domain.com/auth/callback` (if applicable)

---

## 8. Common Setup Gotchas

### Env var naming mismatch

The server Supabase client reads `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY`. If you only set `NEXT_PUBLIC_SUPABASE_ANON_KEY` (the older convention), the server client will be initialized with `undefined` as the key. This causes all server-side Supabase calls to fail silently. Double-check both variable names are set in your deployment environment.

### custom_access_token_hook not firing

If RBAC checks always return BASIC level, the custom access token hook may not be enabled. Verify migration `065_custom_access_token_hook.sql` was applied and that the hook is enabled in the Supabase dashboard (Database → Hooks or via the migration itself).

### Session cookie issues in production

If users are getting unexpectedly logged out, check that:
- The middleware is running on all protected routes (verify `matcher` in `src/middleware.ts`).
- The Supabase project URL matches the deployment URL (no mixed http/https).
- Cookies are not being blocked by a CDN or proxy stripping `Set-Cookie` headers.

### Migration scripts failing

Data migration scripts require `SUPABASE_SERVICE_ROLE_KEY` and a `dotenv` setup. If running outside of the shell with `.env.local`, ensure the env vars are exported before running `./remigrate.sh`.

---

## 9. Environment Summary

| Variable | Required | Scope | Purpose |
|---|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Public (browser + server) | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY` | Yes | Public (browser + server) | Anon/publishable key for user-context requests |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes (migration only) | Server-only | Service role key for admin operations |
