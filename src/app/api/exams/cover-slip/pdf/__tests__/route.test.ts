import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { NextRequest } from 'next/server'
import { makeAttendee, makeBookingDetail } from '@/lib/scheduler/__tests__/booking-detail-fixture'

const state = vi.hoisted(() => ({
  user: null as unknown,
  canSeeExams: false,
  booking: null as unknown,
  render: null as unknown as (html: string) => Promise<Uint8Array>,
}))

vi.mock('@/lib/supabase/auth', () => ({ getCurrentUser: vi.fn(async () => state.user) }))
vi.mock('@/lib/permissions/guard', () => ({ canAccess: vi.fn(async () => state.canSeeExams) }))
vi.mock('@/lib/supabase/queries/scheduler-bookings', () => ({ getBooking: vi.fn(async () => state.booking) }))
vi.mock('@/lib/pdf/render-document-pdf', () => ({ renderDocumentPdf: vi.fn((html: string) => state.render(html)) }))

import { GET } from '../route'
import { getBooking } from '@/lib/supabase/queries/scheduler-bookings'
import { renderDocumentPdf } from '@/lib/pdf/render-document-pdf'

const BOOKING_ID = '99999999-9999-4999-8999-999999999999'
const request = (booking: string | null = BOOKING_ID) =>
  new NextRequest(`http://localhost/api/exams/cover-slip/pdf${booking === null ? '' : `?booking=${encodeURIComponent(booking)}`}`)

beforeEach(() => {
  vi.clearAllMocks()
  vi.spyOn(console, 'error').mockImplementation(() => {})
  state.user = { id: 'user-1' }
  state.canSeeExams = true
  state.booking = makeBookingDetail()
  state.render = async () => new Uint8Array([37, 80, 68, 70])
})
afterEach(() => vi.restoreAllMocks())

describe('GET /api/exams/cover-slip/pdf', () => {
  it('refuses a visitor who is not signed in, before anything is looked up', async () => {
    state.user = null
    const response = await GET(request())
    expect(response.status).toBe(401)
    expect(getBooking).not.toHaveBeenCalled()
    expect(renderDocumentPdf).not.toHaveBeenCalled()
  })

  it('refuses a user who may not see exams, before anything is looked up', async () => {
    state.canSeeExams = false
    const response = await GET(request())
    expect(response.status).toBe(403)
    expect(getBooking).not.toHaveBeenCalled()
  })

  it('refuses a missing or malformed booking id without querying', async () => {
    expect((await GET(request(null))).status).toBe(400)
    expect((await GET(request("1' or '1'='1"))).status).toBe(400)
    expect(getBooking).not.toHaveBeenCalled()
  })

  it('answers 404 for a booking that does not exist', async () => {
    state.booking = null
    expect((await GET(request())).status).toBe(404)
    expect(renderDocumentPdf).not.toHaveBeenCalled()
  })

  it('refuses bookings that are not examinations going ahead', async () => {
    state.booking = makeBookingDetail({ booking_type: 'consultation' })
    expect((await GET(request())).status).toBe(400)
    state.booking = makeBookingDetail({ status: 'cancelled' })
    expect((await GET(request())).status).toBe(400)
    expect(renderDocumentPdf).not.toHaveBeenCalled()
  })

  it('refuses an examination without any candidate', async () => {
    state.booking = makeBookingDetail({ student: null, student_id: null })
    const response = await GET(request())
    expect(response.status).toBe(400)
    expect(response.headers.get('Content-Type')).toContain('text/html')
    expect(await response.text()).toContain('This booking has no candidate to print a slip for.')
  })

  it('returns the PDF inline, private and uncached, named after the exam date and student', async () => {
    const response = await GET(request())
    expect(response.status).toBe(200)
    expect(response.headers.get('Content-Type')).toBe('application/pdf')
    expect(response.headers.get('Content-Disposition')).toBe('inline; filename="cover-slip-2026-10-14-S001.pdf"')
    expect(response.headers.get('Cache-Control')).toBe('private, no-store')
    expect(new Uint8Array(await response.arrayBuffer())).toEqual(new Uint8Array([37, 80, 68, 70]))
  })

  it('hands the renderer the slip as HTML, never a URL', async () => {
    await GET(request())
    const html = vi.mocked(renderDocumentPdf).mock.calls[0][0]
    expect(html).toContain('<!doctype html>')
    expect(html).toContain('Amy Chan')
  })

  it('answers with a plain error and logs no student data when the render fails', async () => {
    state.render = async () => { throw new Error('chromium did not start') }
    const response = await GET(request())
    expect(response.status).toBe(500)
    const page = await response.text()
    expect(page).toContain('The PDF could not be generated. Please try again.')
    expect(page).not.toContain('chromium did not start')
    expect(page).not.toContain('Amy')
    expect(JSON.stringify(vi.mocked(console.error).mock.calls)).not.toContain('Amy')
  })
  it('gives the same answer for a booking that exists and one that does not when the user may not see exams', async () => {
    state.canSeeExams = false
    const existing = await (await GET(request())).text()
    state.booking = null
    expect(await (await GET(request())).text()).toBe(existing)
  })

  it('also prints slips for a pending examination', async () => {
    state.booking = makeBookingDetail({ status: 'pending' })
    expect((await GET(request())).status).toBe(200)
  })

  it('renders a group examination as one PDF with a page per candidate', async () => {
    const student = (id: string, first: string) => ({ id, first_name: first, surname: 'Test', student_code: id })
    state.booking = makeBookingDetail({
      booking_type: 'group_examination', student_id: null, student: null,
      attendees: [
        makeAttendee({ id: 'a1', student_id: 's1', role: 'candidate', seat_no: 1, student: student('s1', 'Amy') }),
        makeAttendee({ id: 'a2', student_id: 's2', role: 'candidate', seat_no: 2, student: student('s2', 'Ben') }),
      ],
    })
    const response = await GET(request())
    expect(response.status).toBe(200)
    expect(response.headers.get('Content-Disposition')).toContain('-group.pdf')
    expect(renderDocumentPdf).toHaveBeenCalledTimes(1)
    expect(vi.mocked(renderDocumentPdf).mock.calls[0][0].match(/<section class="slip">/g)).toHaveLength(2)
  })

  it('refuses an id with surrounding whitespace and uses the first of a repeated parameter', async () => {
    expect((await GET(request(` ${BOOKING_ID} `))).status).toBe(400)
    const repeated = new NextRequest(`http://localhost/api/exams/cover-slip/pdf?booking=${BOOKING_ID}&booking=nope`)
    expect((await GET(repeated)).status).toBe(200)
    expect(getBooking).toHaveBeenCalledWith(BOOKING_ID)
  })
})
