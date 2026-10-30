import { describe, it, expect } from 'vitest'
import {
  formatAddress, formatAddressList, formatEmailDate, formatEmailDay, fromHkLocalInput, guessDirection, parseAddress,
  parseAddressList, toHkLocalInput,
} from '../email-form'

describe('guessDirection', () => {
  it('treats mail from an Academic Asia address as sent by us, anything else as received', () => {
    expect(guessDirection({ name: 'Olivia', address: 'olivia.wong@Academic-Asia.com' })).toBe('sent')
    expect(guessDirection({ name: '', address: 'x@hk.academic-asia.com' })).toBe('sent')
    expect(guessDirection({ name: '', address: 'x@notacademic-asia.com' })).toBe('received')
    expect(guessDirection({ name: 'Mrs Chan', address: 'mrs.chan@gmail.com' })).toBe('received')
    expect(guessDirection(null)).toBe('received')
  })
})

describe('addresses', () => {
  it('formats a name and address, or whichever is known', () => {
    expect(formatAddress({ name: 'Mrs Chan', address: 'c@x.com' })).toBe('Mrs Chan <c@x.com>')
    expect(formatAddress({ name: '', address: 'c@x.com' })).toBe('c@x.com')
    expect(formatAddress({ name: 'c@x.com', address: 'c@x.com' })).toBe('c@x.com')
    expect(formatAddress({ name: 'Bad <name>;', address: 'c@x.com' })).toBe('Bad name <c@x.com>')
    expect(formatAddressList([{ name: 'A', address: 'a@x.com' }, { name: '', address: 'b@y.com' }])).toBe('A <a@x.com>; b@y.com')
  })

  it('reads typed addresses back, keeping "Chan, Mrs" as one person', () => {
    expect(parseAddress('"Mrs Chan" <c@x.com>')).toEqual({ name: 'Mrs Chan', address: 'c@x.com' })
    expect(parseAddress('c@x.com')).toEqual({ name: '', address: 'c@x.com' })
    expect(parseAddress('Head of Admissions')).toEqual({ name: 'Head of Admissions', address: '' })
    expect(parseAddress('   ')).toBeNull()
    expect(parseAddressList('Chan, Mrs <c@x.com>, b@y.com; d@z.com\nE <e@q.com>').map(a => a.address))
      .toEqual(['c@x.com', 'b@y.com', 'd@z.com', 'e@q.com'])
    expect(parseAddressList('Chan, Mrs <c@x.com>')[0].name).toBe('Chan, Mrs')
  })
})

describe('Hong Kong date and time', () => {
  it('converts an instant to the local input value and back exactly', () => {
    expect(toHkLocalInput('2026-10-27T01:15:00.000Z')).toBe('2026-10-27T09:15')
    expect(fromHkLocalInput('2026-10-27T09:15')).toBe('2026-10-27T01:15:00.000Z')
    expect(toHkLocalInput('2026-12-31T20:30:00Z')).toBe('2027-01-01T04:30')
  })

  it('refuses impossible or malformed dates instead of rolling them over', () => {
    expect(fromHkLocalInput('2026-02-30T10:00')).toBeNull()
    expect(fromHkLocalInput('27/10/2026 09:15')).toBeNull()
    expect(fromHkLocalInput('')).toBeNull()
    expect(toHkLocalInput(null)).toBe('')
    expect(toHkLocalInput('nope')).toBe('')
  })

  it('shows dates as DD/MM/YYYY with 24-hour time (WEB-07)', () => {
    expect(formatEmailDate('2026-10-27T13:05:00Z')).toBe('27/10/2026 21:05')
    expect(formatEmailDay('2026-10-27T17:00:00Z')).toBe('28/10/2026')
  })
})
