import { describe, it, expect } from 'vitest'
import { SCHOOL_TABS, isMoreTab, resolveSchoolTab, schoolTabHref, schoolTabLabel } from '../school-tabs'

describe('SCHOOL_TABS', () => {
  it('shows eight tabs in the order of the customer prototype', () => {
    expect(SCHOOL_TABS.filter(t => t.group === 'main').map(t => t.label)).toEqual([
      'Overview', 'Entrance Assessments', 'Fees', 'Exam Results', 'Contacts', 'Events', 'Notes & Info', 'Documents',
    ])
  })

  it('keeps courses, bank details and visits behind "More" instead of dropping them', () => {
    expect(SCHOOL_TABS.filter(t => t.group === 'more').map(t => t.key)).toEqual(['courses', 'bank-details', 'visits'])
    expect(isMoreTab('courses')).toBe(true)
    expect(isMoreTab('fees')).toBe(false)
  })

  it('keeps the URL keys the page has always used', () => {
    expect(SCHOOL_TABS.map(t => t.key)).toEqual([
      'basic', 'entrance-exams', 'fees', 'academic-results', 'contacts', 'events', 'notes', 'documents',
      'courses', 'bank-details', 'visits',
    ])
  })
})

describe('resolveSchoolTab', () => {
  it('opens a known tab', () => {
    expect(resolveSchoolTab('entrance-exams')).toBe('entrance-exams')
    expect(resolveSchoolTab('visits')).toBe('visits')
  })

  it('sends the old supplementary info tab to "Notes & Info"', () => {
    expect(resolveSchoolTab('supplementary')).toBe('notes')
  })

  it('opens the overview for no tab, an unknown tab or a repeated parameter it cannot use', () => {
    expect(resolveSchoolTab(undefined)).toBe('basic')
    expect(resolveSchoolTab('')).toBe('basic')
    expect(resolveSchoolTab('commission')).toBe('basic')
    expect(resolveSchoolTab('__proto__')).toBe('basic')
    expect(resolveSchoolTab(['nope', 'fees'])).toBe('basic')
  })

  it('uses the first value when the parameter is repeated', () => {
    expect(resolveSchoolTab(['fees', 'notes'])).toBe('fees')
  })
})

describe('schoolTabHref and schoolTabLabel', () => {
  it('links to the tab by its key and names it as the tab bar does', () => {
    expect(schoolTabHref('s1', 'academic-results')).toBe('/schools/s1?tab=academic-results')
    expect(schoolTabLabel('academic-results')).toBe('Exam Results')
    expect(schoolTabLabel('bank-details')).toBe('Bank details')
  })
})
