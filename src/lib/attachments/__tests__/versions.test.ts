import { describe, it, expect } from 'vitest'
import { earlierVersions, versionLabel } from '../versions'

describe('earlierVersions', () => {
  it('walks back from the current file to the first one, newest first', () => {
    const rows = [
      { id: 'v1', superseded_by: 'v2' },
      { id: 'v2', superseded_by: 'v3' },
      { id: 'other-paper-old', superseded_by: 'other-paper' },
    ]
    expect(earlierVersions('v3', rows).map(r => r.id)).toEqual(['v2', 'v1'])
    expect(earlierVersions('other-paper', rows).map(r => r.id)).toEqual(['other-paper-old'])
    expect(earlierVersions('v1', rows)).toEqual([])
  })

  it('cannot loop forever on bad data', () => {
    const rows = [{ id: 'a', superseded_by: 'b' }, { id: 'b', superseded_by: 'a' }]
    expect(earlierVersions('a', rows).map(r => r.id)).toEqual(['b'])
  })

  it('names versions from 1', () => {
    expect(versionLabel(0)).toBe('Version 1')
    expect(versionLabel(2)).toBe('Version 3')
  })
})
