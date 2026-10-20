/**
 * Where an application stands on the six-step journey of the customer's
 * prototype (Preparing → … → Family decision).
 *
 * Staff keep maintaining one field, the status. The step is derived from it, so
 * every imported application gets a journey without re-keying and nobody has to
 * keep two fields in step. The mapping below is a working definition taken from
 * the 50 statuses in use; the customer has been asked to confirm it.
 */

export const JOURNEY_STAGES = [
  'preparing',
  'submitted',
  'assessment',
  'awaiting_decision',
  'offer_received',
  'family_decision',
] as const

export type JourneyStage = (typeof JOURNEY_STAGES)[number]

/** Placed: the student holds a place. Closed: the application has ended without one. */
export type JourneyOutcome = 'open' | 'placed' | 'closed'

export type Journey = { stage: JourneyStage | null; outcome: JourneyOutcome }

const STAGE_LABELS: Record<JourneyStage, string> = {
  preparing: 'Preparing',
  submitted: 'Submitted',
  assessment: 'Assessment / interview',
  awaiting_decision: 'Awaiting decision',
  offer_received: 'Offer received',
  family_decision: 'Family decision',
}

const STATUSES_BY_STAGE: Record<JourneyStage, string[]> = {
  preparing: [
    'general_enquiry', 'check_place', 'hold', 'remind_p', 'test_only_refer',
    'proceed', 'proceed_after_ukiset', 'awaiting_response_p',
  ],
  submitted: ['awaiting_response_s', 'awaiting_school_after_ukiset', 'awaiting_exam_paper'],
  assessment: [
    'awaiting_aa_test', 'awaiting_testing', 'awaiting_testing_wo_reg', 'awaiting_interview',
    'awaiting_interview_wl', 'awaiting_interview_reg', 're_assess_after_exam',
  ],
  awaiting_decision: [
    'awaiting_offer', 'awaiting_offer_wo_reg', 'awaiting_ts_result', 'awaiting_expo_result',
    'result_received', 'waiting_list', 'waiting_list_after_exam',
  ],
  offer_received: [
    'offered', 'offered_c', 'offered_wo_reg', 'offered_without_reg', 'offered_scholarship',
    'awaiting_testing_after_offered',
  ],
  family_decision: [
    'deposited', 'deposited_cond', 'deposited_cond_cfmed', 'deposited_scholarship', 'deposited_scholarship_c',
    'awaiting_testing_after_deposit', 'joined_school_left_after', 'declined',
  ],
}

const STAGE_BY_STATUS = new Map<string, JourneyStage>(
  JOURNEY_STAGES.flatMap(stage => STATUSES_BY_STAGE[stage].map(code => [code, stage] as const)),
)

/** Same set the school's placement history counts as placed. */
const PLACED_STATUSES = new Set([
  'deposited', 'deposited_cond', 'deposited_cond_cfmed', 'deposited_scholarship', 'deposited_scholarship_c',
  'joined_school_left_after',
])

const CLOSED_STATUSES = new Set([
  'rejected', 'withdrawn', 'drop', 'cannot_proceed', 'tnfa', 'no_show_interview',
  'full', 'full_check_later', 'full_wl', 'declined',
])

/**
 * Step and outcome for a status code. No status yet means the application is
 * still being prepared. Closed statuses other than "Declined" have no step, and
 * so do "Completed", "Confirmed" and any code added later until it is mapped here.
 */
export function journeyFor(statusCode: string | null | undefined): Journey {
  if (!statusCode) return { stage: 'preparing', outcome: 'open' }
  const outcome: JourneyOutcome = PLACED_STATUSES.has(statusCode)
    ? 'placed'
    : CLOSED_STATUSES.has(statusCode) ? 'closed' : 'open'
  return { stage: STAGE_BY_STATUS.get(statusCode) ?? null, outcome }
}

export function stageLabel(stage: JourneyStage): string {
  return STAGE_LABELS[stage]
}

type StatusOption = { id: number; code: string; label: string }

export type StatusGroup<T extends StatusOption> = { key: JourneyStage | 'closed' | 'other'; label: string; statuses: T[] }

/**
 * Statuses grouped the way the journey reads, for the status picker: one group
 * per step, then the closed statuses without a step, then anything unmapped.
 * Order inside a group is kept from the input (the statuses' sort order).
 */
export function groupStatusesByStage<T extends StatusOption>(statuses: T[]): StatusGroup<T>[] {
  const groups: StatusGroup<T>[] = [
    ...JOURNEY_STAGES.map(stage => ({ key: stage, label: STAGE_LABELS[stage], statuses: [] as T[] })),
    { key: 'closed', label: 'Closed', statuses: [] },
    { key: 'other', label: 'Other', statuses: [] },
  ]
  const byKey = new Map(groups.map(group => [group.key, group]))

  for (const status of statuses) {
    const { stage, outcome } = journeyFor(status.code)
    const key = stage ?? (outcome === 'closed' ? 'closed' : 'other')
    byKey.get(key)?.statuses.push(status)
  }
  return groups.filter(group => group.statuses.length > 0)
}
