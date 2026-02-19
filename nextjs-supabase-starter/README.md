# Next.js 15 + Supabase Starter Template

A production-ready starter template for building SaaS applications with **Next.js 15**, **Supabase**, **React Query**, and **shadcn/ui**.

## ✅ Best Practices Applied

This template follows the **latest best practices** from official Supabase and Next.js documentation:

### Supabase
- ✅ `@supabase/ssr` for server-side auth (not deprecated `auth-helpers`)
- ✅ `getAll()` / `setAll()` cookie pattern (required for proper session handling)
- ✅ **CRITICAL**: No code between `createServerClient` and `getUser()` in middleware
- ✅ Separate clients for browser, server, and admin operations
- ✅ RLS policies with `TO authenticated` for performance
- ✅ `(select auth.uid())` syntax for 99%+ faster RLS
- ✅ Reference tables instead of PostgreSQL ENUMs

### Next.js 15
- ✅ `await cookies()` (async in Next.js 15)
- ✅ Server Components for initial data fetching
- ✅ React Query for client-side mutations and real-time
- ✅ Proper middleware matcher pattern
- ✅ Route groups for auth and dashboard

---

## 🚀 Quick Start

### 1. Clone and Install

```bash
# Clone the template
git clone <this-repo> my-project
cd my-project

# Install dependencies
npm install
```

### 2. Set Up Supabase

```bash
# Install Supabase CLI globally (if not installed)
npm install -g supabase

# Login to Supabase
supabase login

# Link to your project (or create one at supabase.com)
supabase link --project-ref your-project-ref

# Start local Supabase (Docker required)
supabase start
```

### 3. Configure Environment

```bash
# Copy environment template
cp .env.local.example .env.local

# Edit with your Supabase credentials
# Get these from: https://supabase.com/dashboard/project/_/settings/api
```

### 4. Run Migrations

```bash
# Apply migrations to local database
supabase db reset

# Generate TypeScript types
npm run db:gen-types
```

### 5. Start Development

```bash
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000)

---

## 📁 Project Structure

```
src/
├── app/                          # Next.js App Router
│   ├── (auth)/                   # Auth routes (login, register)
│   │   ├── login/
│   │   ├── register/
│   │   └── auth/callback/        # OAuth callback handler
│   ├── (dashboard)/              # Protected routes
│   │   ├── students/
│   │   ├── schools/
│   │   ├── events/
│   │   └── layout.tsx            # Shared dashboard layout
│   ├── layout.tsx                # Root layout
│   ├── providers.tsx             # React Query provider
│   └── globals.css
│
├── components/
│   ├── ui/                       # shadcn/ui components
│   ├── forms/                    # Form components
│   └── students/                 # Feature components
│
├── lib/
│   ├── supabase/
│   │   ├── client.ts             # Browser client
│   │   ├── server.ts             # Server client
│   │   ├── middleware.ts         # Session refresh
│   │   └── admin.ts              # Service role client
│   ├── validations/              # Zod schemas
│   └── utils.ts
│
├── hooks/                        # React Query hooks
├── services/                     # Data access layer
├── types/
│   └── database.types.ts         # Auto-generated from Supabase
│
└── middleware.ts                 # Auth middleware

supabase/
├── migrations/                   # SQL migration files
├── seed.sql                      # Development seed data
└── config.toml                   # Supabase config
```

---

## 🔐 Authentication Flow

### How It Works

1. **Middleware** (`src/middleware.ts`) runs on every request
2. **Session Refresh**: `updateSession()` refreshes expired tokens
3. **Route Protection**: Redirects unauthenticated users to `/login`
4. **Cookie Sync**: Keeps server and browser sessions in sync

### Critical Middleware Pattern

```typescript
// ⚠️ NEVER put code between createServerClient and getUser()
const supabase = createServerClient(...)

// WRONG: Don't do this
// console.log('debug')  ❌

const { data: { user } } = await supabase.auth.getUser()  // ✅
```

---

## 📊 Data Fetching Patterns

### Server Components (Initial Load)

```typescript
// app/(dashboard)/students/page.tsx
export default async function StudentsPage() {
  const supabase = await createClient()
  
  const { data: students } = await supabase
    .from('students')
    .select('*')
    .order('created_at', { ascending: false })

  return <StudentList initialStudents={students} />
}
```

### Client Components (Mutations)

```typescript
// Using React Query hooks
const { data, isLoading } = useStudents({ search })
const createStudent = useCreateStudent()

// Mutations automatically invalidate cache
await createStudent.mutateAsync(formData)
```

---

## 🛡️ Row Level Security (RLS)

### Performance Best Practices

```sql
-- ✅ GOOD: Specify role and use select wrapper
create policy "Users can view students"
  on public.students
  for select
  to authenticated                          -- Always specify role!
  using ((select auth.uid()) = created_by); -- Use select wrapper!

-- ❌ BAD: Missing role and direct function call
create policy "Users can view students"
  on public.students
  for select
  using (auth.uid() = created_by);
```

### Why This Matters

- `TO authenticated` prevents execution for anon users (99%+ faster)
- `(select auth.uid())` is cached per query (massive performance boost)

---

## 🗃️ Database Migrations

### Creating Migrations

```bash
# Create a new migration
npm run db:migrate create_my_table

# Edit the file in supabase/migrations/
```

### Applying Migrations

```bash
# Local development
supabase db reset

# Production
npm run db:push
```

### Generating Types

```bash
# After any schema change
npm run db:gen-types
```

---

## 🔧 Available Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm run db:gen-types` | Generate TypeScript types from database |
| `npm run db:reset` | Reset local database with migrations |
| `npm run db:push` | Push migrations to production |
| `npm run db:migrate` | Create a new migration |

---

## 📦 Tech Stack

| Category | Technology |
|----------|------------|
| Framework | Next.js 15 (App Router) |
| Database | Supabase (PostgreSQL) |
| Auth | Supabase Auth + RLS |
| Styling | Tailwind CSS + shadcn/ui |
| State | React Query (TanStack) |
| Forms | React Hook Form + Zod |
| Icons | Lucide React |

---

## 🚢 Deployment

### Vercel (Recommended)

1. Push to GitHub
2. Import to Vercel
3. Add environment variables:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`

### Supabase

1. Create a production project at [supabase.com](https://supabase.com)
2. Link and push migrations:
   ```bash
   supabase link --project-ref your-prod-ref
   supabase db push
   ```

---

## 📚 Resources

- [Supabase Docs](https://supabase.com/docs)
- [Next.js Docs](https://nextjs.org/docs)
- [React Query Docs](https://tanstack.com/query)
- [shadcn/ui Docs](https://ui.shadcn.com)

---

## License

MIT
