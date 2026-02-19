import {
  useQuery,
  useMutation,
  useQueryClient,
  type UseQueryOptions,
} from '@tanstack/react-query'
import { studentService, type Student, type StudentInsert, type StudentUpdate } from '@/services/students'

// Query keys factory for type-safe cache management
export const studentKeys = {
  all: ['students'] as const,
  lists: () => [...studentKeys.all, 'list'] as const,
  list: (filters: Record<string, unknown>) => [...studentKeys.lists(), filters] as const,
  details: () => [...studentKeys.all, 'detail'] as const,
  detail: (id: string) => [...studentKeys.details(), id] as const,
}

// Get all students with optional filters
export function useStudents(
  options?: {
    status?: string
    search?: string
    limit?: number
    offset?: number
  },
  queryOptions?: Omit<UseQueryOptions<{ data: Student[] | null; count: number | null }>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: studentKeys.list(options || {}),
    queryFn: () => studentService.getAll(options),
    ...queryOptions,
  })
}

// Get single student by ID
export function useStudent(
  id: string,
  queryOptions?: Omit<UseQueryOptions<Student & { student_contacts: unknown[] }>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: studentKeys.detail(id),
    queryFn: () => studentService.getById(id),
    enabled: !!id,
    ...queryOptions,
  })
}

// Create student mutation
export function useCreateStudent() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (student: StudentInsert) => studentService.create(student),
    onSuccess: () => {
      // Invalidate all student lists to refetch
      queryClient.invalidateQueries({ queryKey: studentKeys.lists() })
    },
  })
}

// Update student mutation
export function useUpdateStudent() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: StudentUpdate }) =>
      studentService.update(id, data),
    onSuccess: (_, { id }) => {
      // Invalidate specific student and all lists
      queryClient.invalidateQueries({ queryKey: studentKeys.detail(id) })
      queryClient.invalidateQueries({ queryKey: studentKeys.lists() })
    },
  })
}

// Delete student mutation
export function useDeleteStudent() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => studentService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: studentKeys.lists() })
    },
  })
}
