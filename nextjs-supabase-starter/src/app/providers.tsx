'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { useState, type ReactNode } from 'react'

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // With SSR, we want a stale time to avoid refetching on client mount
            staleTime: 60 * 1000, // 1 minute
            // Don't refetch on window focus for better UX
            refetchOnWindowFocus: false,
            // Retry once on failure
            retry: 1,
          },
          mutations: {
            // Show error to user
            onError: (error) => {
              console.error('Mutation error:', error)
              // You could add a toast notification here
            },
          },
        },
      })
  )

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  )
}
