"use client"

import { useState, useCallback } from "react"
import type { StudentSearchForm } from "@/types"

const initialSearchForm: StudentSearchForm = {
  studentId: "",
  surname: "",
  firstName: "",
  officer: "",
  enrolStatus: "",
  yearApply: "",
  entryYear: "",
  dob: "",
  tel: "",
  email: "",
  saEvent: "",
  eduCourse: "",
}

export function useStudentSearch() {
  const [searchForm, setSearchForm] = useState<StudentSearchForm>(initialSearchForm)
  const [isLoading, setIsLoading] = useState(false)

  const updateField = useCallback((field: keyof StudentSearchForm, value: string) => {
    setSearchForm((prev) => ({ ...prev, [field]: value }))
  }, [])

  const resetForm = useCallback(() => {
    setSearchForm(initialSearchForm)
  }, [])

  const handleSearch = useCallback(async () => {
    setIsLoading(true)
    try {
      // TODO: Implement actual search logic
      console.log("Searching with:", searchForm)
      await new Promise((resolve) => setTimeout(resolve, 1000)) // Simulate API call
    } catch (error) {
      console.error("Search failed:", error)
    } finally {
      setIsLoading(false)
    }
  }, [searchForm])

  return {
    searchForm,
    updateField,
    resetForm,
    handleSearch,
    isLoading,
  }
}
