'use client'

/**
 * Shortlist selection for the schools list.
 *
 * The list is server-rendered and paginated, so selection cannot live in server
 * state — a consultant ticks three schools on page 1 and two more on page 3, and
 * the selection has to survive both navigations and filter changes.
 *
 * Backed by sessionStorage: it outlives navigation and a reload of the tab, but
 * not the tab itself, which is what "session-scoped shortlist" should mean. A
 * stale shortlist reappearing days later would be worse than losing it.
 *
 * Every component reads through this hook, so swapping the backing store for a
 * `student_school_shortlist` table later touches this file and nothing else.
 *
 * The school name is stored alongside the id so the toolbar can list what is
 * selected even when those rows are filtered off the current page.
 */

import { useCallback, useSyncExternalStore } from 'react'

const STORAGE_KEY = 'school-export-selection'

export interface SelectedSchool {
  id: string
  name: string
}

const EMPTY: SelectedSchool[] = []

/**
 * The selection operations, separated from storage and React so the semantics
 * can be tested directly. Each returns the next selection rather than mutating.
 */
export function toggleIn(
  current: SelectedSchool[],
  school: SelectedSchool
): SelectedSchool[] {
  return current.some((s) => s.id === school.id)
    ? current.filter((s) => s.id !== school.id)
    : [...current, school]
}

/**
 * Select or clear a specific set — used by the header checkbox, which acts on
 * the current page only and must leave selections from other pages intact.
 */
export function setManyIn(
  current: SelectedSchool[],
  schools: SelectedSchool[],
  shouldSelect: boolean
): SelectedSchool[] {
  const ids = new Set(schools.map((s) => s.id))
  const untouched = current.filter((s) => !ids.has(s.id))
  return shouldSelect ? [...untouched, ...schools] : untouched
}

/**
 * useSyncExternalStore compares snapshots by reference, so the parsed array is
 * cached and only replaced when the underlying string actually changes.
 * Returning a fresh array each read would re-render forever.
 */
let cachedRaw: string | null = null
let cachedValue: SelectedSchool[] = EMPTY

const listeners = new Set<() => void>()

function read(): SelectedSchool[] {
  if (typeof window === 'undefined') return EMPTY

  const raw = window.sessionStorage.getItem(STORAGE_KEY)
  if (raw === cachedRaw) return cachedValue

  cachedRaw = raw
  if (!raw) {
    cachedValue = EMPTY
    return cachedValue
  }

  try {
    const parsed = JSON.parse(raw)
    cachedValue = Array.isArray(parsed) ? (parsed as SelectedSchool[]) : EMPTY
  } catch {
    // Corrupt storage should not take the page down.
    cachedValue = EMPTY
  }
  return cachedValue
}

function write(next: SelectedSchool[]) {
  if (typeof window === 'undefined') return
  window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  for (const listener of listeners) listener()
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  // Keeps two tabs of the same session broadly consistent; sessionStorage is
  // per-tab, so this mainly covers programmatic clears.
  window.addEventListener('storage', listener)
  return () => {
    listeners.delete(listener)
    window.removeEventListener('storage', listener)
  }
}

/** Server render always starts empty; the real value arrives after hydration. */
const getServerSnapshot = () => EMPTY

export function useSchoolSelection() {
  const selected = useSyncExternalStore(subscribe, read, getServerSnapshot)

  const isSelected = useCallback(
    (id: string) => selected.some((s) => s.id === id),
    [selected]
  )

  const toggle = useCallback((school: SelectedSchool) => {
    write(toggleIn(read(), school))
  }, [])

  const setMany = useCallback((schools: SelectedSchool[], shouldSelect: boolean) => {
    write(setManyIn(read(), schools, shouldSelect))
  }, [])

  const remove = useCallback((id: string) => {
    write(read().filter((s) => s.id !== id))
  }, [])

  const clear = useCallback(() => write([]), [])

  return { selected, count: selected.length, isSelected, toggle, setMany, remove, clear }
}
