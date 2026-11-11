import { describe, expect, it } from 'vitest'
import { nextStep } from '../next-step'

describe('nextStep', () => {
  it('starts a new application with registration', () => {
    expect(nextStep(null)).toMatch(/^Register the student/)
  })
  it('follows the status through the journey', () => {
    expect(nextStep('awaiting_response_s')).toMatch(/book the entrance exam/)
  })
  it('says when an application has ended', () => {
    expect(nextStep('rejected')).toMatch(/has ended/)
  })
})
