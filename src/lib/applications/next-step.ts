import { journeyFor, type JourneyStage } from './application-journey'

const BY_STAGE: Record<JourneyStage, string> = {
  preparing: 'Register the student with the school, then record the registration date and set the status to the school’s reply.',
  submitted: 'Wait for the school to reply. When it does, book the entrance exam or interview and update the status.',
  assessment: 'Check the exam or interview is booked, the papers are ready and the family knows the date.',
  awaiting_decision: 'Follow up with the school for a decision, and file their reply under Emails when it comes.',
  offer_received: 'Tell the family about the offer, agree the deposit deadline and record their answer.',
  family_decision: 'Record the family’s decision: take the deposit to accept, or set the status to declined.',
}

/**
 * What staff should do next with an application, in plain words, from its
 * status. Null when there is nothing to prompt (no status yet that maps to a
 * step, or a status outside the journey).
 */
export function nextStep(statusCode: string | null | undefined): string | null {
  const { stage, outcome } = journeyFor(statusCode)
  if (outcome === 'placed') return 'Placed. Record the deposit if it is not in yet, then arrange the visa and travel.'
  if (outcome === 'closed') return 'This application has ended. Nothing more to do unless the school reopens it.'
  return stage ? BY_STAGE[stage] : null
}
