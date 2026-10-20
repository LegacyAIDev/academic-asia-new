/**
 * Tabs of the school page, in the order of the customer's prototype. The
 * eight "main" tabs are always visible; the rarely used ones sit behind a
 * "More" menu so the page stays uncluttered without hiding any data.
 *
 * URL keys are the ones the page has always used (the exam desk links to
 * ?tab=entrance-exams), so old links keep opening the same content.
 */

export const SCHOOL_TABS = [
  { key: 'basic', label: 'Overview', group: 'main' },
  { key: 'entrance-exams', label: 'Entrance Assessments', group: 'main' },
  { key: 'fees', label: 'Fees', group: 'main' },
  { key: 'academic-results', label: 'Exam Results', group: 'main' },
  { key: 'contacts', label: 'Contacts', group: 'main' },
  { key: 'events', label: 'Events', group: 'main' },
  { key: 'notes', label: 'Notes & Info', group: 'main' },
  { key: 'documents', label: 'Documents', group: 'main' },
  { key: 'courses', label: 'Courses', group: 'more' },
  { key: 'bank-details', label: 'Bank details', group: 'more' },
  { key: 'visits', label: 'Visits', group: 'more' },
] as const

export type SchoolTab = (typeof SCHOOL_TABS)[number]
export type SchoolTabKey = SchoolTab['key']

/**
 * Keys that no longer have a tab of their own but still arrive from old links
 * and bookmarks. A Map, so a crafted ?tab=__proto__ finds nothing.
 */
const TAB_ALIASES = new Map<string, SchoolTabKey>([['supplementary', 'notes']])

const TAB_KEYS = new Set<string>(SCHOOL_TABS.map(tab => tab.key))

/** The tab to show for a ?tab= value; anything unknown opens the overview. */
export function resolveSchoolTab(raw: string | string[] | undefined): SchoolTabKey {
  const value = Array.isArray(raw) ? raw[0] : raw
  if (!value) return 'basic'
  if (TAB_KEYS.has(value)) return value as SchoolTabKey
  return TAB_ALIASES.get(value) ?? 'basic'
}

export function schoolTabHref(schoolId: string, key: SchoolTabKey): string {
  return `/schools/${schoolId}?tab=${key}`
}

export function schoolTabLabel(key: SchoolTabKey): string {
  return SCHOOL_TABS.find(tab => tab.key === key)?.label ?? key
}

export function isMoreTab(key: SchoolTabKey): boolean {
  return SCHOOL_TABS.some(tab => tab.key === key && tab.group === 'more')
}
