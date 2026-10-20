import { describe, it, expect } from 'vitest'
import { JOURNEY_STAGES, groupStatusesByStage, journeyFor, stageLabel, type Journey } from '../application-journey'

/** Every status in application_statuses (50, all active on 2026-10-20) with its working definition. */
const EXPECTED: [string, Journey][] = [
  ['general_enquiry', { stage: 'preparing', outcome: 'open' }],
  ['check_place', { stage: 'preparing', outcome: 'open' }],
  ['hold', { stage: 'preparing', outcome: 'open' }],
  ['remind_p', { stage: 'preparing', outcome: 'open' }],
  ['test_only_refer', { stage: 'preparing', outcome: 'open' }],
  ['proceed', { stage: 'preparing', outcome: 'open' }],
  ['proceed_after_ukiset', { stage: 'preparing', outcome: 'open' }],
  ['awaiting_response_p', { stage: 'preparing', outcome: 'open' }],
  ['awaiting_response_s', { stage: 'submitted', outcome: 'open' }],
  ['awaiting_school_after_ukiset', { stage: 'submitted', outcome: 'open' }],
  ['awaiting_exam_paper', { stage: 'submitted', outcome: 'open' }],
  ['awaiting_aa_test', { stage: 'assessment', outcome: 'open' }],
  ['awaiting_testing', { stage: 'assessment', outcome: 'open' }],
  ['awaiting_testing_wo_reg', { stage: 'assessment', outcome: 'open' }],
  ['awaiting_interview', { stage: 'assessment', outcome: 'open' }],
  ['awaiting_interview_wl', { stage: 'assessment', outcome: 'open' }],
  ['awaiting_interview_reg', { stage: 'assessment', outcome: 'open' }],
  ['re_assess_after_exam', { stage: 'assessment', outcome: 'open' }],
  ['awaiting_offer', { stage: 'awaiting_decision', outcome: 'open' }],
  ['awaiting_offer_wo_reg', { stage: 'awaiting_decision', outcome: 'open' }],
  ['awaiting_ts_result', { stage: 'awaiting_decision', outcome: 'open' }],
  ['awaiting_expo_result', { stage: 'awaiting_decision', outcome: 'open' }],
  ['result_received', { stage: 'awaiting_decision', outcome: 'open' }],
  ['waiting_list', { stage: 'awaiting_decision', outcome: 'open' }],
  ['waiting_list_after_exam', { stage: 'awaiting_decision', outcome: 'open' }],
  ['offered', { stage: 'offer_received', outcome: 'open' }],
  ['offered_c', { stage: 'offer_received', outcome: 'open' }],
  ['offered_wo_reg', { stage: 'offer_received', outcome: 'open' }],
  ['offered_without_reg', { stage: 'offer_received', outcome: 'open' }],
  ['offered_scholarship', { stage: 'offer_received', outcome: 'open' }],
  ['awaiting_testing_after_offered', { stage: 'offer_received', outcome: 'open' }],
  ['deposited', { stage: 'family_decision', outcome: 'placed' }],
  ['deposited_cond', { stage: 'family_decision', outcome: 'placed' }],
  ['deposited_cond_cfmed', { stage: 'family_decision', outcome: 'placed' }],
  ['deposited_scholarship', { stage: 'family_decision', outcome: 'placed' }],
  ['deposited_scholarship_c', { stage: 'family_decision', outcome: 'placed' }],
  ['joined_school_left_after', { stage: 'family_decision', outcome: 'placed' }],
  ['awaiting_testing_after_deposit', { stage: 'family_decision', outcome: 'open' }],
  ['declined', { stage: 'family_decision', outcome: 'closed' }],
  ['rejected', { stage: null, outcome: 'closed' }],
  ['withdrawn', { stage: null, outcome: 'closed' }],
  ['drop', { stage: null, outcome: 'closed' }],
  ['cannot_proceed', { stage: null, outcome: 'closed' }],
  ['tnfa', { stage: null, outcome: 'closed' }],
  ['no_show_interview', { stage: null, outcome: 'closed' }],
  ['full', { stage: null, outcome: 'closed' }],
  ['full_check_later', { stage: null, outcome: 'closed' }],
  ['full_wl', { stage: null, outcome: 'closed' }],
  ['completed', { stage: null, outcome: 'open' }],
  ['confirmed', { stage: null, outcome: 'open' }],
]

describe('journeyFor', () => {
  it('covers all 50 statuses in use', () => {
    expect(new Set(EXPECTED.map(([code]) => code)).size).toBe(50)
  })

  it.each(EXPECTED)('%s', (code, journey) => {
    expect(journeyFor(code)).toEqual(journey)
  })

  it('puts an application without a status at the start', () => {
    expect(journeyFor(null)).toEqual({ stage: 'preparing', outcome: 'open' })
    expect(journeyFor(undefined)).toEqual({ stage: 'preparing', outcome: 'open' })
    expect(journeyFor('')).toEqual({ stage: 'preparing', outcome: 'open' })
  })

  it('gives a status added later no step until it is mapped', () => {
    expect(journeyFor('brand_new_status')).toEqual({ stage: null, outcome: 'open' })
  })
})

describe('stageLabel', () => {
  it('uses the names of the customer prototype, in order', () => {
    expect(JOURNEY_STAGES.map(stageLabel)).toEqual([
      'Preparing', 'Submitted', 'Assessment / interview', 'Awaiting decision', 'Offer received', 'Family decision',
    ])
  })
})

describe('groupStatusesByStage', () => {
  const status = (id: number, code: string) => ({ id, code, label: code })

  it('groups by step in journey order, then closed, then unmapped, keeping the input order inside a group', () => {
    const groups = groupStatusesByStage([
      status(1, 'rejected'), status(2, 'offered'), status(3, 'completed'),
      status(4, 'awaiting_testing'), status(5, 'general_enquiry'), status(6, 'awaiting_interview'),
    ])
    expect(groups.map(g => [g.key, g.statuses.map(s => s.id)])).toEqual([
      ['preparing', [5]],
      ['assessment', [4, 6]],
      ['offer_received', [2]],
      ['closed', [1]],
      ['other', [3]],
    ])
  })

  it('keeps "Declined" with the family decision it belongs to', () => {
    const [group] = groupStatusesByStage([status(36, 'declined')])
    expect(group.key).toBe('family_decision')
    expect(group.label).toBe('Family decision')
  })

  it('returns no groups for no statuses', () => {
    expect(groupStatusesByStage([])).toEqual([])
  })
})
