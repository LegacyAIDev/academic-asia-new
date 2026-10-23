/**
 * Status codes behind the school placement figures. The database view
 * application_placement_outcomes holds the same lists; a test keeps the two in step.
 */

/** Deposited, or joined the school and left later: the family took the place. */
export const PLACED_STATUS_CODES = [
  'deposited', 'deposited_cond', 'deposited_cond_cfmed', 'deposited_scholarship', 'deposited_scholarship_c',
  'joined_school_left_after',
] as const

/** Offered or declined; placed statuses and any application with a deposit count as offers too. */
export const OFFER_STATUS_CODES = [
  'offered', 'offered_c', 'offered_wo_reg', 'offered_without_reg', 'offered_scholarship', 'declined',
] as const

/** Enquiries and checks that are never counted as applications. */
export const NOT_APPLICATION_STATUS_CODES = ['general_enquiry', 'check_place', 'test_only_refer'] as const
