# Project Structure

## Overview
This is a Next.js 14 App Router application following best practices for scalability and maintainability.

## Directory Structure

\`\`\`
app/
├── (dashboard)/          # Route group for authenticated dashboard
│   ├── layout.tsx       # Dashboard layout with sidebar
│   ├── students/        # Student management routes
│   │   └── page.tsx
│   ├── schools/         # School management routes
│   │   └── page.tsx
│   └── events/          # Events management routes
│       └── page.tsx
├── layout.tsx           # Root layout
├── page.tsx             # Root page (redirects to /students)
├── loading.tsx          # Loading UI
└── globals.css          # Global styles

components/
├── features/            # Feature-specific components
│   └── students/
│       └── student-table.tsx
├── layout/              # Layout components
│   ├── header.tsx
│   └── sidebar/
│       ├── sidebar.tsx
│       └── sidebar-nav.tsx
└── ui/                  # shadcn/ui components
    ├── button.tsx
    ├── input.tsx
    └── ...

hooks/                   # Custom React hooks
├── useSidebar.ts
└── useStudentSearch.ts

lib/                     # Utility functions
└── utils.ts

types/                   # TypeScript type definitions
└── index.ts

constants/               # Application constants
└── index.ts

public/                  # Static assets
└── placeholder-32px.png
\`\`\`

## Key Principles

### 1. Route Organization
- Use route groups `(dashboard)` for shared layouts
- Each feature has its own route: `/students`, `/schools`, `/events`
- Server Components by default, Client Components when needed

### 2. Component Structure
- `features/`: Business logic components (student-table, etc.)
- `layout/`: Reusable layout components (header, sidebar)
- `ui/`: Presentational/shadcn components

### 3. Code Colocation
- Keep related files close together
- Feature folders contain all related components

### 4. Type Safety
- Centralized types in `types/index.ts`
- Proper TypeScript throughout

## Best Practices

✅ Server Components by default
✅ Client Components only when needed ('use client')
✅ Proper route structure with App Router
✅ Centralized types and constants
✅ Custom hooks for reusable logic
✅ Clean component separation

## Future Additions

- `app/api/`: API routes for backend logic
- `lib/actions/`: Server Actions for data mutations
- `lib/services/`: API service layer
- `middleware.ts`: Authentication middleware
