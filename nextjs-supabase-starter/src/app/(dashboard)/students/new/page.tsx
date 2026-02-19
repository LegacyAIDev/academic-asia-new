import { StudentForm } from '@/components/students/student-form'

export default function NewStudentPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Add New Student</h1>
        <p className="mt-1 text-sm text-gray-500">
          Create a new student profile
        </p>
      </div>

      <div className="rounded-lg border bg-white p-6 shadow">
        <StudentForm />
      </div>
    </div>
  )
}
